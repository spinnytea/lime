'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var fs = require('fs');
var config = require('../../../config');
var ideas = require('../../../src/core/database/ideas');
var links = require('../../../src/core/database/links');
var tools = require('../testingTools');

describe('ideas', function() {
  it('init', function() {
    // this is assumed by ideas; we can't really do anything but ensure it's existence
    expect(config.data.location).to.be.a('string');

    // this is to ensure we test everything
    expect(Object.keys(ideas)).to.deep.equal(['create', 'save', 'load', 'close']);
  });

  describe('ProxyIdea', function() {
    it('new', function() {
      var idea = tools.ideas.create();

      expect(Object.keys(idea)).to.deep.equal(['id']);
      expect(idea.update).to.be.a('function');
      expect(idea.data).to.be.a('function');
    });

    it('update', function() {
      var data = { 'things': 3.14 };
      var idea = tools.ideas.create();
      expect(idea.data()).to.deep.equal({});

      idea.update(data);

      expect(idea.data()).to.deep.equal(data); // deep equal
      expect(idea.data()).to.not.equal(data); // not shallow equal (it's a different object)
    });

    it('update closed', function() {
      var idea = tools.ideas.create();
      expect(idea.data()).to.deep.equal({});

      ideas.close(idea);
      idea.update({ 'things': 3.14 });
      expect(idea.data()).to.deep.equal({ 'things': 3.14 });

      ideas.close(idea);
      idea.update({ 'objects': 2.7 });
      expect(idea.data()).to.deep.equal({ 'things': 3.14, 'objects': 2.7 });
    });

    it('data closed', function() {
      var data = { 'things': 3.14 };
      var idea = tools.ideas.create(data);
      expect(idea.data()).to.deep.equal(data);

      ideas.close(idea);

      expect(idea.data()).to.deep.equal(data);
    });

    describe('link', function() {
      var ideaA, ideaB;

      it('add', function() {
        ideaA = tools.ideas.create();
        ideaB = tools.ideas.create();
        ideas.close(ideaA);
        ideas.close(ideaB);

        // links are closed; this link still work
        ideaA.link(links.list.thought_description, ideaB);
        ideas.close(ideaA);
        ideas.close(ideaB);

        expect(fs.existsSync(tools.ideas.filepath(ideaA.id, 'links'))).to.equal(true);
        expect(fs.existsSync(tools.ideas.filepath(ideaB.id, 'links'))).to.equal(true);
        expect(fs.existsSync(tools.ideas.filepath(ideaA.id, 'data'))).to.equal(false);
        expect(fs.existsSync(tools.ideas.filepath(ideaB.id, 'data'))).to.equal(false);

        // links are closed; get should still work
        expect(_.pluck(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
        expect(_.pluck(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);

      });

      it('add: invalid arg', function() {
        var ideaA = tools.ideas.create();

        expect(function() { ideaA.link(); }).to.throw(TypeError);
        expect(function() { ideaA.link('thing'); }).to.throw(TypeError);
      });
    }); // end links
  }); // end ProxyIdea

  it.skip('ideas.proxy'); // TODO update subgraph to use this instead of ideas.load

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
      it('no data', function() {
        var idea = tools.ideas.create();

        ideas.save(idea);

        expect(fs.existsSync(tools.ideas.filepath(idea.id, 'data'))).to.equal(false);
        expect(fs.existsSync(tools.ideas.filepath(idea.id, 'links'))).to.equal(false);

        ideas.close(idea);
        ideas.load(idea.id); // the proxy will still work

        expect(idea.data()).to.deep.equal({});
      });

      it('with data', function() {
        var data = { 'things': -1 };
        var idea = tools.ideas.create(data);

        ideas.save(idea);
        expect(fs.existsSync(tools.ideas.filepath(idea.id, 'data'))).to.equal(true);
        expect(fs.existsSync(tools.ideas.filepath(idea.id, 'links'))).to.equal(false);

        ideas.close(idea);
        ideas.load(idea.id); // the proxy will still work

        expect(idea.data()).to.deep.equal(data);
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
        expect(function() { ideas.save('1 smoothie lifetime'); }).to.throw();

        expect(function() { ideas.load(); }).to.throw();
        expect(function() { ideas.load(1); }).to.throw();
      });
    }); // end save / load

    it('close', function() {
      expect(function() { ideas.close(); }).to.throw();
      expect(function() { ideas.close('1 smoothie lifetime'); }).to.throw();

      var idea = tools.ideas.create();
      expect(function() { ideas.close(idea); }).to.not.throw();
    });
  }); // end crud
}); // end ideas
