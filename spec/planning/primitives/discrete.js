'use strict';
var expect = require('chai').expect;
var discrete = require('../../../src/planning/primitives/discrete');
var tools = require('../../testingTools');

var boolean = discrete.definitions.list.boolean;
describe('discrete', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(discrete)).to.deep.equal(['isDiscrete', 'cast', 'difference', 'definitions']);
    expect(Object.keys(discrete.definitions)).to.deep.equal(['similar', 'difference', 'create', 'list']);

    expect(discrete.definitions.list.boolean).to.not.equal(undefined);
  });

  // TODO should this throw an exception?
  it('isDiscrete', function() {
    expect(discrete.isDiscrete(undefined)).to.equal(false);
    expect(discrete.isDiscrete({})).to.equal(false);
    expect(discrete.isDiscrete({ value: true })).to.equal(false);
    expect(discrete.isDiscrete({ unit: boolean })).to.equal(false);

    // the point of the type is to short circuit the tests
    // and it's an identifier of the type
    // if the other values aren't there then there is a larger problem
    expect(discrete.isDiscrete({ type: 'lime_discrete' })).to.equal(true);

    expect(discrete.isDiscrete({ type: 'wrong type', value: true, unit: boolean })).to.equal(false);
    expect(discrete.isDiscrete({ value: 'wrong value', unit: boolean })).to.equal(false);
    expect(discrete.isDiscrete({ value: 'true', unit: 'wrong unit' })).to.equal(false);
    expect(discrete.isDiscrete({ value: true, unit: 'wrong unit' })).to.equal(false);
    expect(discrete.isDiscrete({ value: 0, unit: boolean })).to.equal(false);

    expect(discrete.isDiscrete({ value: true, unit: boolean })).to.equal(true);
    expect(discrete.isDiscrete({ value: false, unit: boolean })).to.equal(true);
    expect(discrete.isDiscrete({ type: 'lime_discrete', value: true, unit: boolean })).to.equal(true);
  });

  it('cast', function() {
    var crt = { value: true, unit: boolean };
    expect(crt).to.not.have.property('type');

    discrete.cast(crt);

    expect(crt).to.have.property('type');
    expect(crt.type).to.equal('lime_discrete');

    // not a discrete
    expect(discrete.cast()).to.equal(undefined);
    expect(discrete.cast({})).to.equal(undefined);
    expect(discrete.cast({value: 'only'})).to.equal(undefined);
    expect(discrete.cast({unit: 'only'})).to.equal(undefined);
  });

  it('difference', function() {
    var t = {value: true, unit: boolean};
    var f = {value: false, unit: boolean};

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

    tools.ideas.clean(roygbiv);
  });

  describe('definitions', function() {
    it('create', function() {
      var NOT_ENOUGH_STATES = 'must pass an array of states with more than one value';
      expect(function() { discrete.definitions.create(); }).to.throw(NOT_ENOUGH_STATES);
      expect(function() { discrete.definitions.create({}); }).to.throw(NOT_ENOUGH_STATES);
      expect(function() { discrete.definitions.create([]); }).to.throw(NOT_ENOUGH_STATES);

      var states = ['r', 'o', 'y', 'g', 'b', 'i', 'v'];
      var roygbiv = discrete.definitions.create(states);
      expect(roygbiv.data().type).to.not.equal(undefined);
      expect(roygbiv.data().states).to.deep.equal(states);

      tools.ideas.clean(roygbiv);

      // difference fn doesn't exist
      expect(function() { discrete.definitions.create(['a', 'b'], 'not a diff fn'); }).to.throw('"not a diff fn" does not exist');
    });

    it('difference', function() {
      expect(function() { discrete.definitions.create(states, 'banana'); }).to.throw(TypeError);

      var states = ['a', 'b', 'c', 'd', 'e', 'f'];
      var alpha = discrete.definitions.create(states, 'cycle');
      var a = { value: 'a', unit: alpha.id };
      var b = { value: 'b', unit: alpha.id };
      var c = { value: 'c', unit: alpha.id };
      var d = { value: 'd', unit: alpha.id };
      var e = { value: 'e', unit: alpha.id };
      var f = { value: 'f', unit: alpha.id };

      expect(discrete.difference(a, a)).to.equal(0);
      expect(discrete.difference(a, b)).to.equal(1);
      expect(discrete.difference(a, c)).to.equal(2);
      expect(discrete.difference(a, d)).to.equal(3);
      expect(discrete.difference(a, e)).to.equal(2);
      expect(discrete.difference(a, f)).to.equal(1);
    });
  }); // end definitions
}); // end discrete
