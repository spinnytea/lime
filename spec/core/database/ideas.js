'use strict';
/* global describe, it, beforeEach, afterEach */
var expect = require('chai').expect;
var config = require('../../../config');
var ideas = require('../../../src/core/database/ideas');

// proxy functions so I can keep track of items the test create and delete
function doCreate() {
  doCreate.count++;
  return ideas.create();
}
doCreate.count = 0;
function doDelete() {
  doDelete.count++;
}
doDelete.count = 0;

describe('ideas', function() {
  beforeEach(function() {
    doCreate.count = 0;
    doDelete.count = 0;
  });
  afterEach(function() {
    expect(doDelete.count).to.equal(doCreate.count);
  });

  it('init', function() {
    expect(config.data.location).to.be.ok;
    expect(ideas.create).to.be.ok;
    expect(ideas.save).to.be.ok;
    expect(ideas.load).to.be.ok;
  });

  describe('crud', function() {
    it.skip('create');
    it.skip('update');
    it.skip('read');
  }); // end crud
}); // end ideas
