'use strict';
/* global describe, it */
var expect = require('chai').expect;

var stub = require('../../src/planning/stub');

describe('stub', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(stub)).to.deep.equal(['Action']);
    expect(Object.keys(stub.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'save']);
  });

  it.skip('everything');

  it.skip('save & load');
});