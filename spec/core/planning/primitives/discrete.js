'use strict';
/* global describe, it */
var expect = require('chai').expect;
var discrete = require('../../../../src/core/planning/primitives/discrete');
var tools = require('../../testingTools');

describe('discrete', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(discrete)).to.deep.equal(['difference', 'definitions']);
    expect(Object.keys(discrete.definitions)).to.deep.equal(['create']);
  });

  it('isDiscrete', function() {
      var boolean = discrete.definitions.create(['true', 'false']);
      var t = {value: 'true', unit: boolean.id};

      // is discrete isn't exposed, so we need to first make sure the difference works
      // (if this test fails here, then it's not this test's fault)
      expect(discrete.difference(t, t)).to.equal(0);

      expect(discrete.difference(t, undefined)).to.equal(undefined);
      expect(discrete.difference(t, {})).to.equal(undefined);
      expect(discrete.difference(t, { type: 'lime_discrete' })).to.equal(undefined);
      expect(discrete.difference(t, { value: 'true' })).to.equal(undefined);
      expect(discrete.difference(t, { unit: boolean.id })).to.equal(undefined);

      expect(discrete.difference(t, { type: 'wrong type', value: 'true', unit: boolean.id })).to.equal(undefined);
      expect(discrete.difference(t, { value: 'wrong value', unit: boolean.id })).to.equal(undefined);
      expect(discrete.difference(t, { value: 'true', unit: 'wrong unit' })).to.equal(undefined);

      expect(discrete.difference(t, { value: 'true', unit: boolean.id })).to.equal(0);
      expect(discrete.difference(t, { type: 'lime_discrete', value: 'true', unit: boolean.id })).to.equal(0);

      // fills in the type for later
      var val = { type: '', value: 'false', unit: boolean.id };
      expect(discrete.difference(t, val)).to.equal(1);
      expect(val.type).to.equal('lime_discrete');

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
