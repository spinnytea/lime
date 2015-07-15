'use strict';
var _ = require('lodash');
var Promise = require('bluebird'); // jshint ignore:line
var expect = require('chai').use(require('sinon-chai')).expect;
var sinon = require('sinon');
var config = require('../../src/config');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var tools = require('../testingTools');

describe('ideas', function() {
  it('init', function() {
    // this is assumed by ideas; we can't really do anything but ensure it's existence
    expect(config.settings.location).to.be.a('string');

    // this is to ensure we test everything
    expect(Object.keys(ideas)).to.deep.equal(['create', 'save', 'load', 'proxy', 'close', 'context']);
  });

  describe('ProxyIdea', function() {
    var bak = {};
    beforeEach(function() {
      bak.saveObj = ideas.units.boundaries.saveObj;
      bak.loadObj = ideas.units.boundaries.loadObj;

      ideas.units.boundaries.saveObj = sinon.spy();
      ideas.units.boundaries.loadObj = sinon.spy();
    });
    afterEach(function() {
      ideas.units.boundaries.saveObj = bak.saveObj;
      ideas.units.boundaries.loadObj = bak.loadObj;
    });

    it('new', function() {
      var idea = ideas.proxy('_test_');

      expect(idea.constructor.name).to.equal('ProxyIdea');
      expect(Object.keys(idea)).to.deep.equal(['id']);
      expect(idea.update).to.be.a('function');
      expect(idea.data).to.be.a('function');
      expect(JSON.parse(JSON.stringify(idea))).to.deep.equal({id:'_test_'});

      expect(ideas.units.boundaries.saveObj).to.have.callCount(0);
      expect(ideas.units.boundaries.loadObj).to.have.callCount(0);
    });

    it('update', function() {
      var data = { 'things': 3.14 };
      var idea = tools.ideas.create();

      expect(idea.data()).to.deep.equal({});
      expect(ideas.units.memory[idea.id].data).to.deep.equal({});

      idea.update(data);

      // deep equal
      expect(idea.data()).to.deep.equal(data);
      expect(ideas.units.memory[idea.id].data).to.deep.equal(data);
      // not shallow equal (it's a different object)
      expect(idea.data()).to.not.equal(data);
      expect(ideas.units.memory[idea.id].data).to.not.equal(data);

      expect(ideas.units.boundaries.saveObj).to.have.callCount(0);
      expect(ideas.units.boundaries.loadObj).to.have.callCount(0);
    });

    it('update closed', function() {
      var idea = tools.ideas.create();
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

      expect(ideas.units.boundaries.saveObj).to.have.callCount(4);
      expect(ideas.units.boundaries.loadObj).to.have.callCount(4);
    });

    it('data closed', function() {
      var data = { 'things': 3.14 };
      var idea = tools.ideas.create(data);
      expect(idea.data()).to.deep.equal(data);
      expect(ideas.units.memory).to.have.property(idea.id);

      ideas.close(idea);
      expect(ideas.units.memory).to.not.have.property(idea.id);

      expect(ideas.units.boundaries.loadObj).to.have.callCount(0);
      ideas.units.boundaries.loadObj = sinon.stub().returns(data);

      expect(idea.data()).to.deep.equal(data);
      expect(ideas.units.memory).to.have.property(idea.id);

      expect(ideas.units.boundaries.saveObj).to.have.callCount(4);
      expect(ideas.units.boundaries.loadObj).to.have.callCount(2);
    });

    describe('link', function() {
      var ideaA, ideaB;

      it('add', function() {
        ideaA = tools.ideas.create();
        ideaB = tools.ideas.create();
        ideas.close(ideaA);
        ideas.close(ideaB);

        expect(ideas.units.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.units.boundaries.loadObj).to.have.callCount(0);

        // links are closed; this link still work
        ideaA.link(links.list.thought_description, ideaB); // link be idea

        expect(ideas.units.boundaries.saveObj).to.have.callCount(4);
        expect(ideas.units.boundaries.loadObj).to.have.callCount(4);

        expect(_.pluck(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
        expect(_.pluck(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);
      });

      it('remove', function() {
        ideaA = tools.ideas.create();
        ideaB = tools.ideas.create();


        // verify add
        ideaA.link(links.list.thought_description, ideaB.id); // link by id
        expect(_.pluck(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
        expect(_.pluck(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);

        // verify remove
        ideaA.unlink(links.list.thought_description, ideaB.id); // link by id
        expect(_.pluck(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([]);
        expect(_.pluck(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([]);


        // now with opposite

        // verify add
        ideaA.link(links.list.thought_description, ideaB.id); // link by id
        expect(_.pluck(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
        expect(_.pluck(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);

        // verify remove
        ideaB.unlink(links.list.thought_description.opposite, ideaA.id); // link by id
        expect(_.pluck(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([]);
        expect(_.pluck(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([]);


        expect(ideas.units.boundaries.saveObj).to.have.callCount(0);
        expect(ideas.units.boundaries.loadObj).to.have.callCount(0);
      });

      it('add: invalid arg', function() {
        var ideaA = tools.ideas.create();

        expect(function() { ideaA.link(); }).to.throw(TypeError);
        expect(function() { ideaA.link('thing'); }).to.throw(TypeError);
      });

      it('remove: invalid arg', function() {
        var ideaA = tools.ideas.create();

        expect(function() { ideaA.unlink(); }).to.throw(TypeError);
        expect(function() { ideaA.unlink('thing', ideaA); }).to.throw(TypeError);
      });
    }); // end links
  }); // end ProxyIdea

  it('ideas.proxy', function() {
    expect(function() { ideas.proxy(); }).to.throw(TypeError);
    expect(function() { ideas.proxy(true); }).to.throw(TypeError);

    // there really isn't a way for me to properly test this
    // I have been avoiding adding a handle to the internal memory object
    // there really isn't a way to test that nothing was loaded
    // so... whatevs

    var idea = tools.ideas.create();
    ideas.close(idea);
    var proxy = ideas.proxy(idea);

    expect(proxy.id).to.equal(idea.id);
  });

  describe('crud', function() {
    describe('create', function() {
      it('empty', function() {
        var idea = tools.ideas.create();
        expect(idea.data()).to.deep.equal({});
      });

      it('w/ data', function() {
        var idea = tools.ideas.create({ 'things': 2.7 });
        expect(idea.data()).to.deep.equal({ 'things': 2.7 });
      });
    });

    describe('save / load', function() {
      it('no data', function(done) {
        var idea = tools.ideas.create();

        ideas.save(idea);

        Promise.all([
          tools.ideas.exists(idea.id, 'data', false),
          tools.ideas.exists(idea.id, 'links', false)
        ]).then(function(results) {
          expect(results).to.deep.equal([false, false]);

          ideas.close(idea);
          ideas.load(idea.id); // the proxy will still work

          expect(idea.data()).to.deep.equal({});
        }).done(done, done);
      });

      it('with data', function(done) {
        var data = { 'things': -1 };
        var idea = tools.ideas.create(data);

        ideas.save(idea);
        Promise.all([
          tools.ideas.exists(idea.id, 'data', true),
          tools.ideas.exists(idea.id, 'links', false)
        ]).then(function(results) {
          expect(results).to.deep.equal([true, false]);

          ideas.close(idea);
          ideas.load(idea.id); // the proxy will still work

          expect(idea.data()).to.deep.equal(data);
        }).done(done, done);
      });

      it('save: unloaded', function() {
        var idea = tools.ideas.create({ 'things': 42 });
        ideas.close(idea);
        ideas.save(idea);
      });

      it('load: loaded', function() {
        var idea = tools.ideas.create();
        ideas.load(idea);
        ideas.load(idea);
      });

      it('invalid arg', function() {
        expect(function() { ideas.save(); }).to.throw();
        expect(function() { ideas.save(10); }).to.throw();
        expect(function() { ideas.save({foo: 10}); }).to.throw();

        expect(function() { ideas.load(); }).to.throw();
        expect(function() { ideas.load(1); }).to.throw();
      });

      it.skip('path doesn\'t exist, w/ location');

      it.skip('path doesn\'t exist, w/o location');
    }); // end save / load

    it('close', function() {
      expect(function() { ideas.close(); }).to.throw();
      expect(function() { ideas.close(10); }).to.throw();
      expect(function() { ideas.close({ foo: '1 smoothie lifetime' }); }).to.throw();

      var idea = tools.ideas.create();
      expect(function() { ideas.close(idea); }).to.not.throw();
      expect(function() { ideas.close('a'); }).to.not.throw();
    });
  }); // end crud

  describe('proxy', function() {
    it('shouldn\'t load memory', function() {
      var id = '_test_';
      expect(ideas.units.memory[id]).to.equal(undefined);
      ideas.proxy(id);
      expect(ideas.units.memory[id]).to.equal(undefined);
    });
  }); // end proxy

  it('context', function() {
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

  describe('units', function() {
    it('init', function() {
      // this is to ensure we test everything
      expect(Object.keys(ideas.units)).to.deep.equal(['memory', 'filepath', 'filename', 'boundaries']);
      // memory is a data structure, so it doesn't need to be tested directly
    });

    it('filepath', function() {
      expect(ideas.units.filepath('')).to.equal(config.settings.location + '');
      expect(ideas.units.filepath('1')).to.equal(config.settings.location + '');
      expect(ideas.units.filepath('12')).to.equal(config.settings.location + '');
      expect(ideas.units.filepath('123')).to.equal(config.settings.location + '/12');
      expect(ideas.units.filepath('1234')).to.equal(config.settings.location + '/12');
      expect(ideas.units.filepath('12345')).to.equal(config.settings.location + '/12/34');
      expect(ideas.units.filepath('123456')).to.equal(config.settings.location + '/12/34');
      expect(ideas.units.filepath('1234567')).to.equal(config.settings.location + '/12/34/56');
    });

    it('filename', function() {
      expect(ideas.units.filename('1', 'data')).to.equal(config.settings.location + '/1_data.json');
      expect(ideas.units.filename('123', 'links')).to.equal(config.settings.location + '/12/123_links.json');
    });

    // integration test
    describe('boundaries', function() {
      it.skip('saveObj');

      it.skip('loadObj');
    }); // end boundaries
  });
}); // end ideas
