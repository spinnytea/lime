'use strict';
/* global describe, it */
var expect = require('chai').expect;
var links = require('../../../src/core/database/links');

describe('links', function() {
  it('init', function() {
    expect(links.list.thought_description.name).to.equal('thought_description');
    expect(links.list.thought_description.opposite.opposite).to.equal(links.list.thought_description);

    expect(function() { links.list.thought_description = 'stuff'; }).to.throw(Error);
    expect(function() { links.list.thought_description.name = 'stuff'; }).to.throw(Error);
  });
});