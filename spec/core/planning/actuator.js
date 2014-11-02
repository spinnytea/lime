'use strict';
/* global describe, it */
var expect = require('chai').expect;
var actuator = require('../../../src/core/planning/actuator');

describe('actuator', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply']);
    // no need to test cost
  });

  it('runCost', function() {
    var a = new actuator.Action();
    expect(function() { a.runCost(); }).to.throw(TypeError);

    // we 'should' pass in a valid transition
    // but then we 'should' setup everything else
    a = new actuator.Action([{}]);
    expect(a.runCost()).to.equal(1);
  });

  it.skip('tryTransition');

  it.skip('runBlueprint');

  it.skip('apply');
});