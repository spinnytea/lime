'use strict';
/* global describe, it */
var expect = require('chai').expect;
var discrete = require('../../../../src/core/planning/primitives/discrete');
var tools = require('../../testingTools');

describe('discrete', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(discrete)).to.deep.equal(['isDiscrete', 'difference', 'definitions']);
    expect(Object.keys(discrete.definitions)).to.deep.equal(['similar', 'create']);
  });

  // TODO should this throw an exception?
  it('isDiscrete', function() {
    var boolean = discrete.definitions.create(['true', 'false']);

    expect(discrete.isDiscrete(undefined)).to.equal(false);
    expect(discrete.isDiscrete({})).to.equal(false);
    expect(discrete.isDiscrete({ value: 'true' })).to.equal(false);
    expect(discrete.isDiscrete({ unit: boolean.id })).to.equal(false);

    // the point of the type is to short circuit the tests
    // and it's an identifier of the type
    // if the other values aren't there then there is a larger problem
    expect(discrete.isDiscrete({ type: 'lime_discrete' })).to.equal(true);

    expect(discrete.isDiscrete({ type: 'wrong type', value: 'true', unit: boolean.id })).to.equal(false);
    expect(discrete.isDiscrete({ value: 'wrong value', unit: boolean.id })).to.equal(false);
    expect(discrete.isDiscrete({ value: 'true', unit: 'wrong unit' })).to.equal(false);

    expect(discrete.isDiscrete({ value: 'true', unit: boolean.id })).to.equal(true);
    expect(discrete.isDiscrete({ type: 'lime_discrete', value: 'true', unit: boolean.id })).to.equal(true);

    tools.ideas.clean(boolean);
  });

  it('difference', function() {
    var boolean = discrete.definitions.create(['true', 'false']);
    var t = {value: 'true', unit: boolean.id};
    var f = {value: 'false', unit: boolean.id};

    var roygbiv = discrete.definitions.create(['r', 'o', 'y', 'g', 'b', 'i', 'v']);
    var r = {value: 'r', unit: roygbiv.id};
    var b = {value: 'b', unit: roygbiv.id};


    expect(discrete.difference()).to.equal(undefined);
    expect(discrete.difference(t, undefined)).to.equal(undefined);
    // TODO should this throw an exception?
    expect(discrete.difference(t, r)).to.equal(undefined);

    expect(discrete.difference(t, t)).to.equal(0);
    expect(discrete.difference(t, f)).to.equal(1);

    expect(discrete.difference(r, r)).to.equal(0);
    expect(discrete.difference(r, b)).to.equal(1);

    tools.ideas.clean(boolean);
    tools.ideas.clean(roygbiv);
  });

  describe('definitions', function() {
    it('create', function() {
      expect(function() { discrete.definitions.create(); }).to.throw(Error);
      expect(function() { discrete.definitions.create({}); }).to.throw(Error);
      expect(function() { discrete.definitions.create([]); }).to.throw(Error);

      var states = ['true', 'false'];
      var boolean = discrete.definitions.create(states);
      expect(boolean.data().type).to.be.ok;
      expect(boolean.data().states).to.deep.equal(states);

      tools.ideas.clean(boolean);
    });
  }); // end definitions
}); // end discrete
