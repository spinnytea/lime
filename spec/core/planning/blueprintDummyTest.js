'use strict';
/* global describe, it */
var expect = require('chai').expect;
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var serialplan = require('../../../src/core/planning/serialplan');
var actuator = require('../../../src/core/planning/actuator');

describe('serialplan', function() {
  it('inheritance', function() {
    expect(serialplan.Action).to.be.a('function');
    expect(actuator.Action).to.be.a('function');
    expect(Object.keys(blueprint.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);

    // this isn't implemented by serialplan
    var sa = new serialplan.Action();
    expect(sa.requirements).to.be.ok;
    expect(function() { sa.tryTransition(); }).to.throw('SerialAction does not implement tryTransition');
  });
  it.skip('blueprint.BlueprintAction is a path.Action'); // combine with init
  it.skip('blueprint.BlueprintState is a path.State'); // combine with init

  it.skip('blueprint.BlueprintState distance');
  it.skip('blueprint.BlueprintState distance: this needs a complete context upgrade');
  // like, seriously. What does the distance even mean?
  // it is it primitive distance? like the change in price?
  // does difference in price have the same weight as difference in count?
  // what about type difference? how far is an apple from a pear? they are both fruits?
  // does this even matter? this should be part of the searching
  // maybe if the search says "this idea must be a fruit" then so long as it matches, then the distance is zero?
  // does this mean that primitive distance is the only thing that matters?

  it.skip('AC: subgraph.match: i.transitionable === o.transitionable');
  // try to match subgraphs with 00, 01, 10, 11 transitionable states
  // ... or is it fine having the if statement in the blueprint.State.distance?
});
