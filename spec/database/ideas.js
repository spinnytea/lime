'use strict';
var _ = require('lodash');
var expect = require('chai').use(require('sinon-chai')).expect;
var sinon = require('sinon');
var config = require('../../src/config');
var discrete = require('../../src/planning/primitives/discrete');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');

exports.mock = function() {
  var bakSave;
  var bakLoad;
  before(function() {
    bakSave = ideas.boundaries.saveObj;
    bakLoad = ideas.boundaries.loadObj;
  });
  beforeEach(function() {
    // create a new spy for every test
    ideas.boundaries.saveObj = sinon.spy();
    ideas.boundaries.loadObj = sinon.stub();

    // this is a stock object that we use a lot for tests
    ideas.boundaries.loadObj.withArgs(discrete.definitions.list.boolean, 'data').returns({ type: 'lime_discrete_definition', states: [ true, false ] });
  });
  after(function() {
    ideas.boundaries.saveObj = bakSave;
    ideas.boundaries.loadObj = bakLoad;
  });
};

describe('ideas', function() {
  it('init', function() {
    // this is assumed by ideas; we can't really do anything but ensure it's existence
    expect(config.settings.location).to.be.a('string');

    // this is to ensure we test everything
    expect(Object.keys(ideas)).to.deep.equal(['create', 'save', 'load', 'proxy', 'close', 'context']);
  });

  describe('ProxyIdea', function() {
    exports.mock();

    it('new', function() {
      var idea = ideas.proxy('_test_');

      expect(idea.constructor.name).to.equal('ProxyIdea');
      expect(Object.keys(idea)).to.deep.equal(['id']);
      expect(idea.update).to.be.a('function');
      expect(idea.data).to.be.a('function');
      expect(JSON.parse(JSON.stringify(idea))).to.deep.equal({id:'_test_'});

      expect(ideas.boundaries.saveObj).to.have.callCount(0);
      expect(ideas.boundaries.loadObj).to.have.callCount(0);
    });

    it('update', function() {
      var data = { 'things': 3.14 };
      var idea = ideas.create();

      expect(idea.data()).to.deep.equal({});
      expect(ideas.units.memory[idea.id].data).to.deep.equal({});

      idea.update(data);

      // deep equal
      expect(idea.data()).to.deep.equal(data);
      expect(ideas.units.memory[idea.id].data).to.deep.equal(data);
      // not shallow equal (it's a different object)
      expect(idea.data()).to.not.equal(data);
      expect(ideas.units.memory[idea.id].data).to.not.equal(data);

      expect(ideas.boundaries.saveObj).to.have.callCount(0);
      expect(ideas.boundaries.loadObj).to.have.callCount(0);
    });

    it('update closed', function() {
      var idea = ideas.create();
      expect(ideas.units.memory).to.have.property(idea.id);
      expect(idea.data()).to.deep.equal({});

      ideas.close(idea);
      expect(ideas.units.memory).to.not.have.property(idea.id);

      idea.update({ 'things': 3.14 });
      expect(ideas.units.memory).to.have.property(idea.id);
      expect(idea.data()).to.deep.equal({ 'things': 3.14 });

      // again!
      ideas.close(idea);
      expect(ideas.units.memory).to.not.have.property(idea.id);

      idea.update({ 'objects': 2.7 });
      expect(ideas.units.memory).to.have.property(idea.id);
      expect(idea.data()).to.deep.equal({ 'objects': 2.7 });

      expect(ideas.boundaries.saveObj).to.have.callCount(4);
      expect(ideas.boundaries.loadObj).to.have.callCount(4);
    });

    it('data closed', function() {
      var data = { 'things': 3.14 };
      var idea = ideas.create(data);
      expect(idea.data()).to.deep.equal(data);
      expect(ideas.units.memory).to.have.property(idea.id);

      ideas.close(idea);
      expect(ideas.units.memory).to.not.have.property(idea.id);

      expect(ideas.boundaries.loadObj).to.have.callCount(0);
      ideas.boundaries.loadObj.withArgs(idea.id, 'data').returns(data);

      expect(idea.data()).to.deep.equal(data);
      expect(ideas.units.memory).to.have.property(idea.id);

      expect(ideas.boundaries.saveObj).to.have.callCount(4);
      expect(ideas.boundaries.loadObj).to.have.callCount(2);
    });

    describe('link', function() {
      var ideaA, ideaB;

      it('add', function() {
        ideaA = ideas.create();
        ideaB = ideas.create();
        ideas.close(ideaA);
        ideas.close(ideaB);

        expect(ideas.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);

        // links are closed; this link still work
        ideaA.link(links.list.thought_description, ideaB); // link be idea

        expect(ideas.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.boundaries.loadObj).to.have.callCount(4);

        expect(_.map(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
        expect(_.map(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);

        ideas.boundaries.saveObj.reset();
        expect(ideas.boundaries.saveObj).to.have.callCount(0);

        ideas.save(ideaA);
        ideas.save(ideaB);

        // XXX since I can't set a dynamic key during object construction, we need to create the object beforehand
        var linkA = { 'thought_description': {} }; linkA['thought_description'][ideaB.id] = {};
        var linkB = { 'thought_description-opp': {} }; linkB['thought_description-opp'][ideaA.id] = {};
        expect(ideas.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.boundaries.saveObj).to.have.been.calledWith(ideaA.id, 'data', {});
        expect(ideas.boundaries.saveObj).to.have.been.calledWith(ideaA.id, 'links', linkA);
        expect(ideas.boundaries.saveObj).to.have.been.calledWith(ideaB.id, 'data', {});
        expect(ideas.boundaries.saveObj).to.have.been.calledWith(ideaB.id, 'links', linkB);
      });

      it('remove', function() {
        ideaA = ideas.create();
        ideaB = ideas.create();

        expect(ideas.units.memory[ideaA.id].links).to.deep.equal({});
        expect(ideas.units.memory[ideaB.id].links).to.deep.equal({});

        // verify add
        ideaA.link(links.list.thought_description, ideaB.id); // link by id
        expect(_.map(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
        expect(_.map(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);

        // XXX since I can't set a dynamic key during object construction, we need to create the object beforehand
        var linkA = { 'thought_description': {} }; linkA['thought_description'][ideaB.id] = {};
        var linkB = { 'thought_description-opp': {} }; linkB['thought_description-opp'][ideaA.id] = {};
        expect(ideas.units.memory[ideaA.id].links).to.deep.equal(linkA);
        expect(ideas.units.memory[ideaB.id].links).to.deep.equal(linkB);

        // verify remove
        ideaA.unlink(links.list.thought_description, ideaB.id); // link by id
        expect(_.map(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([]);
        expect(_.map(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([]);

        expect(ideas.units.memory[ideaA.id].links).to.deep.equal({});
        expect(ideas.units.memory[ideaB.id].links).to.deep.equal({});

        // now with opposite

        // verify add
        ideaA.link(links.list.thought_description, ideaB.id); // link by id
        expect(_.map(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
        expect(_.map(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);

        expect(ideas.units.memory[ideaA.id].links).to.deep.equal(linkA);
        expect(ideas.units.memory[ideaB.id].links).to.deep.equal(linkB);

        // verify remove
        ideaB.unlink(links.list.thought_description.opposite, ideaA.id); // link by id
        expect(_.map(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([]);
        expect(_.map(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([]);

        expect(ideas.units.memory[ideaA.id].links).to.deep.equal({});
        expect(ideas.units.memory[ideaB.id].links).to.deep.equal({});

        expect(ideas.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
      });

      it('add undirected', function() {
        var link = links.list._test__undirected_;

        ideaA = ideas.create();
        ideaB = ideas.create();
        ideaA.link(link, ideaB); // link be idea

        expect(ideaA.link(link)).to.deep.equal([ideaB]);
        expect(ideaB.link(link)).to.deep.equal([ideaA]);

        ideaA.unlink(link, ideaB);

        expect(ideaA.link(link)).to.deep.equal([]);
        expect(ideaB.link(link)).to.deep.equal([]);
      });

      it('add: invalid arg', function() {
        var ideaA = ideas.create();

        expect(function() { ideaA.link(); }).to.throw(TypeError);
        expect(function() { ideaA.link('thing'); }).to.throw(TypeError);
      });

      it('remove: invalid arg', function() {
        var ideaA = ideas.create();

        expect(function() { ideaA.unlink(); }).to.throw(TypeError);
        expect(function() { ideaA.unlink('thing', ideaA); }).to.throw(TypeError);
      });
    }); // end links
  }); // end ProxyIdea

  describe('crud', function() {
    exports.mock();

    describe('create', function() {
      it('empty', function() {
        var idea = ideas.create();
        expect(idea.data()).to.deep.equal({});
      });

      it('w/ data', function() {
        var idea = ideas.create({ 'things': 2.7 });
        expect(idea.data()).to.deep.equal({ 'things': 2.7 });
      });
    });

    describe('save / load', function() {
      it('no data', function() {
        var idea = ideas.create();

        ideas.save(idea);

        expect(ideas.boundaries.saveObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'data', {});
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'links', {});
        ideas.boundaries.saveObj.reset();

        expect(ideas.units.memory[idea.id].data).to.deep.equal({});
        ideas.close(idea);
        expect(ideas.units.memory[idea.id]).to.equal(undefined);

        expect(ideas.boundaries.saveObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'data', {});
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'links', {});
        ideas.boundaries.saveObj.reset();

        ideas.boundaries.loadObj.withArgs(idea.id, 'data').returns({});
        ideas.boundaries.loadObj.withArgs(idea.id, 'links').returns({});
        expect(idea.data()).to.deep.equal({});
        expect(ideas.units.memory[idea.id].data).to.deep.equal({});

        expect(ideas.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.boundaries.loadObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.calledWith(idea.id, 'data');
        expect(ideas.boundaries.loadObj).to.have.calledWith(idea.id, 'links');
      });

      it('with data', function() {
        var data = { 'things': -1 };
        var idea = ideas.create(data);

        expect(ideas.boundaries.saveObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'data', data);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'links', {});
        ideas.boundaries.saveObj.reset();

        ideas.save(idea);

        expect(ideas.boundaries.saveObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'data', data);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'links', {});
        ideas.boundaries.saveObj.reset();

        expect(ideas.units.memory[idea.id].data).to.deep.equal(data);
        ideas.close(idea);
        expect(ideas.units.memory[idea.id]).to.equal(undefined);

        expect(ideas.boundaries.saveObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'data', data);
        expect(ideas.boundaries.saveObj).to.have.calledWith(idea.id, 'links', {});
        ideas.boundaries.saveObj.reset();

        ideas.boundaries.loadObj.withArgs(idea.id, 'data').returns(data);
        ideas.boundaries.loadObj.withArgs(idea.id, 'links').returns({});
        expect(idea.data()).to.deep.equal(data);
        expect(ideas.units.memory[idea.id].data).to.deep.equal(data);

        expect(ideas.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.boundaries.loadObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.calledWith(idea.id, 'data');
        expect(ideas.boundaries.loadObj).to.have.calledWith(idea.id, 'links');
      });

      it('save: unloaded', function() {
        var idea = ideas.create({ 'things': 42 });
        expect(ideas.boundaries.saveObj).to.have.callCount(2);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        ideas.close(idea);
        expect(ideas.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        ideas.save(idea);
        expect(ideas.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        ideas.save(idea);
        ideas.save(idea);
        expect(ideas.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
      });

      it('load: loaded', function() {
        var idea = ideas.create();
        expect(ideas.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        ideas.load(idea);
        expect(ideas.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
        ideas.load(idea);
        ideas.load(idea);
        expect(ideas.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
      });

      it('invalid arg', function() {
        expect(function() { ideas.save(); }).to.throw();
        expect(function() { ideas.save(10); }).to.throw();
        expect(function() { ideas.save({foo: 10}); }).to.throw();

        expect(function() { ideas.load(); }).to.throw();
        expect(function() { ideas.load(1); }).to.throw();

        expect(ideas.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.boundaries.loadObj).to.have.callCount(0);
      });
    }); // end save / load

    it('close', function() {
      expect(function() { ideas.close(); }).to.throw();
      expect(function() { ideas.close(10); }).to.throw();
      expect(function() { ideas.close({ foo: '1 smoothie lifetime' }); }).to.throw();
      expect(ideas.boundaries.saveObj).to.have.callCount(0);
      expect(ideas.boundaries.loadObj).to.have.callCount(0);

      var idea = ideas.create();
      expect(ideas.units.memory).to.have.property(idea.id);
      expect(function() { ideas.close(idea); }).to.not.throw();
      expect(ideas.boundaries.saveObj).to.have.callCount(2);
      expect(ideas.boundaries.loadObj).to.have.callCount(0);

      expect(ideas.units.memory).to.not.have.property('_test_');
      expect(function() { ideas.close('_test_'); }).to.not.throw();
      expect(ideas.boundaries.saveObj).to.have.callCount(2); // no change since that thought doesn't exist
      expect(ideas.boundaries.loadObj).to.have.callCount(0);
    });
  }); // end crud

  describe('proxy', function() {
    exports.mock();

    afterEach(function() {
      // just verify
      // it's not really a question, so it doesn't need to be in each test
      expect(ideas.boundaries.saveObj).to.have.callCount(0);
      expect(ideas.boundaries.loadObj).to.have.callCount(0);
    });

    it('should throw errors', function() {
      expect(function() { ideas.proxy(); }).to.throw(TypeError);
      expect(function() { ideas.proxy(true); }).to.throw(TypeError);
    });

    it('should accept an id or an idea', function() {
      var idea = ideas.create();
      var proxy = ideas.proxy(idea);
      var proxy2 = ideas.proxy(idea.id);
      var proxy3 = ideas.proxy(proxy);

      expect(proxy.id).to.equal(idea.id); // created with idea
      expect(proxy2.id).to.equal(idea.id); // created with id
      expect(proxy3.id).to.equal(idea.id); // created with a proxy (fun fun)
      expect(proxy).to.deep.equal(proxy2); // they are deeply equal
      expect(proxy).to.not.equal(proxy2); // they are different objects
    });

    it('shouldn\'t load memory', function() {
      var id = '_test_';
      expect(ideas.units.memory[id]).to.equal(undefined);
      ideas.proxy(id);
      expect(ideas.units.memory[id]).to.equal(undefined);
    });
  }); // end proxy

  describe('context', function() {
    exports.mock();

    it('should update config', function() {
      // first, ensure the context has be
      expect(config.data).to.not.equal(undefined);
      expect(config.data.ideas).to.not.equal(undefined);

      expect(config.data.ideas.context.test).to.equal(undefined);
      var test_context = ideas.context('test');
      expect(test_context).to.be.an('object'); // proxy idea
      expect(config.data.ideas.context.test).to.not.equal(undefined);

      // if we call it again, we should get the same thing
      expect(ideas.context('test')).to.deep.equal(test_context);

      // clean up after the test
      delete config.data.ideas.context.test;
      config.save();
    });
  }); // end context

  describe('boundaries', function() {
    it('init', function() {
      // this is to ensure we test everything
      expect(Object.keys(ideas.boundaries)).to.deep.equal(['saveObj', 'loadObj', 'fileSave', 'fileLoad', 'memorySave', 'memoryLoad', 'database']);
    });

    it.skip('fileSave');

    it.skip('fileLoad');

    it.skip('memorySave');

    it.skip('memoryLoad');
  }); // end boundaries
}); // end ideas
