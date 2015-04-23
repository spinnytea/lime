'use strict';
/* global describe, it, before */
var expect = require('chai').expect;

var actuator = require('../../src/planning/actuator');
var blueprint = require('../../src/planning/primitives/blueprint');
var stub = require('../../src/planning/stub');

describe('stub', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(stub)).to.deep.equal(['Action', 'solveAtList']);
    expect(Object.keys(stub.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'save']);
  });

  var s;
  before(function() {
    s = new stub.Action();
  });

  it('runCost', function() {
    expect(s.runCost).to.equal(actuator.Action.prototype.runCost);
  });

  it('tryTransition', function() {
    expect(s.tryTransition).to.equal(actuator.Action.prototype.tryTransition);
  });

  it('runBlueprint', function() {
    // this should never implement runBlueprint because you cannot actually run it
    // the ONLY exception would be ...
    //   if solveAt === 'runtime'
    //   this would imply that we want to resolve it every time we run, that it should never actually be saved
    //   we wouldn't use solveAt === 'runBlueprint' because that implies that serialplan et al should handle it
    expect(function() {
      s.runBlueprint();
    }).to.throw('StubAction does not implement runBlueprint');
  });

  it('cost', function() {
    expect(s.cost).to.equal(blueprint.Action.prototype.cost);
  });

  it('apply', function() {
    expect(s.apply).to.equal(actuator.Action.prototype.apply);
  });

  it.skip('save & load');

  describe('planning', function() {
    it.skip('basic, concrete');

    describe('solveAt', function() {
      it.skip('planCreate');
    });
  });
});