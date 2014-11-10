'use strict';
/* global describe, it, beforeEach */
var _ = require('lodash');
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
    a.actionImpl = function() { actionImplCount++; }; // XXX is this check necessary?

    var sg = new subgraph.Subgraph();
    sg.addVertex(subgraph.matcher.id, count_unit);
    state_count = sg.addVertex(subgraph.matcher.id, count, true);
    start = new blueprint.State(sg, [a]);

    goal = new blueprint.State(sg.copy(), [a]);
    goal.state.vertices[state_count].data = { value: number.value(5), unit: count_unit.id };

    // we need these to be different values to check our tryTansitions result
    expect(a_c).to.not.equal(state_count);
  });

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(serialplan)).to.deep.equal(['Action', 'create']);
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply']);
  });

  it('create', function() {
    // standard case, success
    var sp = serialplan.create(start, goal);
    expect(sp).to.be.ok;
    expect(sp.plans.length).to.equal(5);

    // there is no way to create a plan to get here
    sp = serialplan.create(goal, start);
    expect(sp).to.not.be.ok;

    // only one step away
    goal.state.vertices[state_count].data.value = number.value(1);
    sp = serialplan.create(start, goal);
    expect(sp).to.be.ok;
    expect(sp).to.equal(a);


    // right now, it creates a serial plan with no actions
    // do we want to return undefined?
    // - no because undefined usually indicates an error, or that we can't get from one place to the next
    // so instead, we create a false runCost
    // we shouldn't use this plan to get from A to A, because that's a waste of time
    //
    // we should check to see if we even need to make a plan before we try to make one
    // but if we do (for some unforseen reason), I don't want to return undefined, nor throw an exception, nor even make an impossibly large plan
    // you are already at the goal
    // if you are using SP to get no where, well, it's better to just increase the runCost
    // searching for a plan should exclude this because it's a waste (but not a blocker)
    //
    // as you can probably tell, there isn't yet a definitive answer
    sp = serialplan.create(start, start);
    expect(sp).to.be.ok;
    expect(sp.plans.length).to.equal(0);
    expect(sp.runCost()).to.equal(1);
    expect(sp.cost(start, goal)).to.equal(2); // start:0 goal:1 + runCost()
  });

  describe('SerialPlan', function() {
    it('runCost', function() {
      var sp = serialplan.create(start, goal);
      expect(sp.runCost()).to.equal(5);

      sp = serialplan.create(start, start);
      expect(sp.runCost()).to.equal(1);
    });

    it('tryTransition', function() {
      var sp = serialplan.create(start, goal);
      var glues = sp.tryTransition(start);
      expect(actionImplCount).to.equal(0);

      expect(glues.length).to.equal(1); // there is only possible path
      expect(glues[0].length).to.equal(sp.plans.length); // there are 5 steps in the path
      // each of these has a mapping from a_c to state_count
      expect(_.pluck(glues[0], a_c)).to.deep.equal([state_count, state_count, state_count, state_count, state_count]);

      // we should be able to try our transition from the goal
      // (this is just trying things out; doesn't mean it will take us places)
      glues = sp.tryTransition(goal);
      expect(glues.length).to.equal(1);
      expect(_.pluck(glues[0], a_c)).to.deep.equal([state_count, state_count, state_count, state_count, state_count]);

      // something we can't apply the transition to
      // so the array is empty
      glues = sp.tryTransition(new blueprint.State(new subgraph.Subgraph(), []));
      expect(glues).to.deep.equal([]);

      expect(actionImplCount).to.equal(0);
    });

    it('runBlueprint', function() {
      var sp = serialplan.create(start, goal);
      var glues = sp.tryTransition(start);
      expect(glues.length).to.equal(1);
      expect(actionImplCount).to.equal(0);

      sp.runBlueprint(start, glues[0]);

      // the state and the ideas have been updated
      expect(start.state.vertices[state_count].data.value).to.deep.equal(number.value(5));
      expect(count.data().value).to.deep.equal(number.value(5));
      expect(actionImplCount).to.equal(5);
    });

    it('cost', function() {
      var sp = serialplan.create(start, goal);
      expect(sp.cost(start, goal)).to.equal(10);

      // so start cannot get to the goal
      goal.state.vertices[state_count].transitionable = false;
      expect(sp.cost(start, goal)).to.equal(Infinity);
      goal.state.vertices[state_count].transitionable = true;

      // this plan cannot use the 'goal' as a starting point
      // ~~ sp can only do a cost(x, y) where x.matches(sp.reqs)
      expect(sp.cost(goal, goal)).to.equal(Infinity);

      // this plan has nothing to do, but it should still have some kind of cost
      sp = serialplan.create(start, start);
      expect(sp.cost(start, start)).to.equal(1);
    });

    it('apply', function() {
      var sp = serialplan.create(start, goal);
      var glues = sp.tryTransition(start);
      expect(glues.length).to.equal(1);
      expect(actionImplCount).to.equal(0);

      var result = sp.apply(start, glues[0]);

      // this is a new experimental state
      expect(result).to.not.equal(start);
      expect(result.state.vertices[state_count].data.value).to.deep.equal(number.value(5));

      // the state and the ideas have not changed
      expect(start.state.vertices[state_count].data.value).to.deep.equal(number.value(0));
      expect(count.data().value).to.deep.equal(number.value(0));
      expect(actionImplCount).to.equal(0);
    });

    it.skip('nested blueprint cost');
  }); // end SerialPlan
}); // end serialplan