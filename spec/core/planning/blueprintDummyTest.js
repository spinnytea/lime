'use strict';
/* global describe, it */
var expect = require('chai').expect;
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var serialplan = require('../../../src/core/planning/serialplan');
var actuator = require('../../../src/core/planning/actuator');

describe.only('serialplan', function() {
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
  it.skip('blueprint.BlueprintAction is a path.Action'); // combine with init
  it.skip('blueprint.BlueprintState is a path.State'); // combine with init

  it.skip('blueprint.BlueprintState distance: this needs a complete context upgrade');
  // like, seriously. What does the distance even mean?
  // it is it primitive distance? like the change in price?
  // what about type difference? how far is an apple from a pear? they are both fruits?
  // does this even matter? this should be part of the searching
  // maybe if the search says "this idea must be a fruit" then so long as it matches, then the distance is zero?
  // does this mean that primitive distance is the only thing that matters?
});
