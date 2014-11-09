'use strict';
/* global describe, it, beforeEach */
var expect = require('chai').expect;
var actuator = require('../../../src/core/planning/actuator');
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var number = require('../../../src/core/planning/primitives/number');
var serialplan = require('../../../src/core/planning/serialplan');
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe('serialplan', function() {
  var count;
  var a, a_c, actionImplCount;
  var start, state_count, goal;
  beforeEach(function() {
    // our state, just a simple object with a value of 0
    var count_unit = tools.ideas.create();
    count = tools.ideas.create({ value: number.value(0), unit: count_unit.id });

    // an action that adds one to our value
    // it doesn't DO anything, but we should keep track of how many times it has been called
    a = new actuator.Action();
    a_c = a.requirements.addVertex(subgraph.matcher.id, count, true);
    a.transitions.push({ vertex_id: a_c, combine: { value: number.value(1), unit: count_unit.id } });
    actionImplCount = 0;
    a.actionImpl = function() { actionImplCount++; };

    var sg = new subgraph.Subgraph();
    state_count = sg.addVertex(subgraph.matcher.id, count, true);
    start = new blueprint.State(sg, [a]);

    goal = new blueprint.State(sg.copy(), []);
    goal.state.vertices[state_count].data = { value: number.value(5), unit: count_unit.id };
  });

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply']);
  });

  it.skip('create serial plan');

  it.skip('runCost');

  it.skip('tryTransition');

  it.skip('runBlueprint');

  it.skip('cost');

  it.skip('apply');

  it.skip('nested blueprint cost');
}); // end serialplan