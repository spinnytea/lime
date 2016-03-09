'use strict';
var expect = require('chai').expect;
var links = require('../../src/database/links');

describe('links', function() {
  it('init', function() {
    expect(links).to.not.have.property('units');
  });
}); // end links