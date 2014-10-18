'use strict';
/* global describe, it, beforeEach, afterEach */
var expect = require('chai').expect;
var fs = require('fs');
var config = require('../../../config');
var ideas = require('../../../src/core/database/ideas');

// proxy functions so I can keep track of items the test create and delete
function doCreate(data) {
  doCreate.count++;
  return ideas.create(data);
}
doCreate.count = 0;
function doDelete(id) {
  doDelete.count++;
  deleteFile(id, 'data');
}
function deleteFile(id, which) {
  var path = filepath(id, which);
  if(fs.existsSync(path))
    fs.unlinkSync(path);
}
doDelete.count = 0;
// Copied from the src / I need this to test but it shouldn't be global
function filepath(id, which) {
  return config.data.location + '/' + id + '_' + which + '.json';
}


describe('ideas', function() {
  beforeEach(function() {
    doCreate.count = 0;
    doDelete.count = 0;
  });
  afterEach(function() {
    // TODO this masks any error that occurs during the test
//    expect(doDelete.count).to.equal(doCreate.count);
  });

  it('init', function() {
    expect(config.data.location).to.be.a('string');
    expect(Object.keys(ideas)).to.deep.equal(['create', 'save', 'load', 'close']);
//    expect(Object.keys(ideas).map(function(key) { return typeof ideas[key]; })).to.deep.equal(['function', 'function', 'function', 'function']);
  });

  describe('ProxyIdea', function() {
    it('new', function() {
      var idea = doCreate();

      expect(Object.keys(idea)).to.deep.equal(['id']);
      expect(idea.update).to.be.a('function');
      expect(idea.data).to.be.a('function');

      doDelete(idea.id);
    });

    it('update', function() {
      var data = { 'things': 3.14 };
      var idea = doCreate();
      expect(idea.data()).to.deep.equal({});

      idea.update(data);

      expect(idea.data()).to.deep.equal(data); // deep equal
      expect(idea.data()).to.not.equal(data); // not shallow equal (it's a different object)
      doDelete(idea.id);
    });

    it('update closed', function() {
      var idea = doCreate();
      expect(idea.data()).to.deep.equal({});

      ideas.close(idea);
      idea.update({ 'things': 3.14 });
      expect(idea.data()).to.deep.equal({ 'things': 3.14 });

      ideas.close(idea);
      idea.update({ 'objects': 2.7 });
      expect(idea.data()).to.deep.equal({ 'things': 3.14, 'objects': 2.7 });

      doDelete(idea.id);
    });

    it('data closed', function() {
      var data = { 'things': 3.14 };
      var idea = doCreate(data);
      expect(idea.data()).to.deep.equal(data);

      ideas.close(idea);

      expect(idea.data()).to.deep.equal(data);
      doDelete(idea.id);
    });
  }); // end ProxyIdea

  describe('crud', function() {
    it('create', function() {
      var idea = doCreate();
      expect(idea.data()).to.deep.equal({});
      doDelete(idea.id);

      idea = doCreate({ 'things': 2.7 });
      expect(idea.data()).to.deep.equal({ 'things': 2.7 });
      doDelete(idea.id);
    });

    describe('save / load', function() {
      it('no data', function() {
        var idea = doCreate();

        ideas.save(idea);

        expect(fs.existsSync(filepath(idea.id, 'data'))).to.equal(false);

        ideas.close(idea);
        ideas.load(idea.id); // the proxy will still work

        expect(idea.data()).to.deep.equal({});

        doDelete(idea.id);
      });

      it('with data', function() {
        var data = { 'things': -1 };
        var idea = doCreate(data);

        ideas.save(idea);
        expect(fs.existsSync(filepath(idea.id, 'data'))).to.equal(true);

        ideas.close(idea);
        ideas.load(idea.id); // the proxy will still work

        expect(idea.data()).to.deep.equal(data);

        doDelete(idea.id);
      });

      it('save: unloaded', function() {
        var idea = doCreate({ 'things': 42 });
        ideas.close(idea);
        ideas.save(idea);
        doDelete(idea.id);
      });

      it('load: loaded', function() {
        var idea = doCreate();
        ideas.load(idea);
        doDelete(idea.id);
      });

      it('invalid arg', function() {
        expect(function() { ideas.save(); }).to.throw();
        expect(function() { ideas.save(10); }).to.throw();

        expect(function() { ideas.load(); }).to.throw();
        expect(function() { ideas.load(10); }).to.throw();
      });
    }); // end save / load

    it('close', function() {
      expect(function() { ideas.close(); }).to.throw();
      expect(function() { ideas.close(10); }).to.throw();

      var idea = doCreate();
      expect(function() { ideas.close(idea); }).to.not.throw();
      doDelete(idea.id);
    });
  }); // end crud
}); // end ideas
