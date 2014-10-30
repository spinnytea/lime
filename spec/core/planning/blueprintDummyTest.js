'use strict';
/* global describe, it */
var expect = require('chai').expect;
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var serialplan = require('../../../src/core/planning/serialplan');
var actuator = require('../../../src/core/planning/actuator');

describe('serialplan', function() {
  it('init', function() {
    expect(serialplan.SerialAction).to.be.a('function');
    expect(actuator.ActuatorAction).to.be.a('function');
    expect(Object.keys(blueprint.BlueprintAction.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);
    expect(Object.keys(serialplan.SerialAction.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);
    expect(Object.keys(actuator.ActuatorAction.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);

    var sa = new serialplan.SerialAction();
    expect(sa.requirements).to.be.ok;
    expect(function() { sa.tryTransition(); }).to.throw('SerialAction does not implement tryTransition');
  });

  it.skip('blueprint.BlueprintAction is a path.Action');

  it.skip('blueprint.BlueprintState is a path.State');
});
