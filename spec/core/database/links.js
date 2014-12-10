'use strict';
/* global describe, it */
var expect = require('chai').expect;
var links = require('../../../src/core/database/links');

describe('links', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(links)).to.deep.equal(['create', 'list']);
    expect(Object.keys(links.list).length).to.be.gt(0); // the keys don't matter, just so long as they are enumerable
  });

  it('create/list', function() {
    expect(links.list.thought_description.name).to.equal('thought_description');
    expect(links.list.thought_description.opposite.opposite).to.equal(links.list.thought_description);

    expect(function() { links.list.thought_description = 'stuff'; }).to.throw(Error);
    expect(function() { links.list.thought_description.name = 'stuff'; }).to.throw(Error);
  });

  describe('type_of', function() {
    it.skip('hierarchy');
  }); // end type_of
}); // end links