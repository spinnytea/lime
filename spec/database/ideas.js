'use strict';
/* global describe, it */
var _ = require('lodash');
var Promise = require('bluebird'); // jshint ignore:line
var expect = require('chai').expect;
var config = require('../../config');
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
      expect(idea.data()).to.deep.equal({ 'objects': 2.7 });
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

      it('add', function(done) {
        ideaA = tools.ideas.create();
        ideaB = tools.ideas.create();
        ideas.close(ideaA);
        ideas.close(ideaB);

        // links are closed; this link still work
        ideaA.link(links.list.thought_description, ideaB); // link be idea
        ideas.close(ideaA);
        ideas.close(ideaB);

        Promise.all([
          tools.ideas.exists(ideaA.id, 'links', true),
          tools.ideas.exists(ideaB.id, 'links', true),
          tools.ideas.exists(ideaA.id, 'data', false),
          tools.ideas.exists(ideaB.id, 'data', false)
        ]).then(function(results) {
          expect(results).to.deep.equal([true, true, false, false]);

          // links are closed; get should still work
          expect(_.pluck(ideaA.link(links.list.thought_description), 'id')).to.deep.equal([ideaB.id]);
          expect(_.pluck(ideaB.link(links.list.thought_description.opposite), 'id')).to.deep.equal([ideaA.id]);
        }).done(done, done);
      });

      it('remove', function(done) {
        ideaA = tools.ideas.create();
        ideaB = tools.ideas.create();
        ideaA.link(links.list.thought_description, ideaB.id); // link by id
        ideas.close(ideaA);
        ideas.close(ideaB);

        Promise.all([
          tools.ideas.exists(ideaA.id, 'links', true),
          tools.ideas.exists(ideaB.id, 'links', true)
        ]).then(function(results) {
          expect(results).to.deep.equal([true, true]);

          ideaA.unlink(links.list.thought_description, ideaB);
          ideas.save(ideaA);
          ideas.save(ideaB);

          return Promise.all([
            tools.ideas.exists(ideaA.id, 'links', false),
            tools.ideas.exists(ideaB.id, 'links', false)
          ]);
        }).then(function(results) {
          expect(results).to.deep.equal([false, false]);
        }).done(done, done);
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
}); // end ideas
