'use strict';
/* global describe, it, beforeEach, afterEach */
var expect = require('chai').expect;
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
}
doDelete.count = 0;

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
    expect(config.data.location).to.be.ok;
    expect(Object.keys(ideas)).to.deep.equal(['create', 'save', 'load', 'close']);
//    expect(Object.keys(ideas).map(function(key) { return typeof ideas[key]; })).to.deep.equal(['function', 'function', 'function', 'function']);
  });

  describe('proxy idea', function() {
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

    it.skip('update closed', function() {
      var data = { 'things': 3.14 };
      var idea = doCreate();
      expect(idea.data()).to.deep.equal({});

      ideas.close(idea);
      idea.update(data);

      expect(idea.data()).to.deep.equal(data);
      doDelete(idea.id);
    });

    it.skip('data closed', function() {
      var data = { 'things': 3.14 };
      var idea = doCreate(data);
      expect(idea.data()).to.deep.equal({});

      ideas.close(idea);

      expect(idea.data()).to.deep.equal(data);
      doDelete(idea.id);
    });
  }); // end proxy idea

  describe('crud', function() {
    it('create', function() {
      var idea = doCreate();
      expect(idea.data()).to.deep.equal({});
      doDelete(idea.id);

      idea = doCreate({ 'things': 2.7 });
      expect(idea.data()).to.deep.equal({ 'things': 2.7 });
      doDelete(idea.id);
    });

    it.skip('update');

    it.skip('read');

    it.skip('close');
  }); // end crud
}); // end ideas
