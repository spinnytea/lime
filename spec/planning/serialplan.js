'use strict';
/* global describe, it, beforeEach */
var _ = require('lodash');
var expect = require('chai').expect;
var actuator = require('../../src/planning/actuator');
var blueprint = require('../../src/planning/primitives/blueprint');
var config = require('../../config');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var serialplan = require('../../src/planning/serialplan');
var subgraph = require('../../src/database/subgraph');
var tools = require('../testingTools');

describe('serialplan', function() {
  it.skip('can we reduce the setup for these tests; can we use "before" instead of "beforeEach"');
  var count;
  var a, a_c, actionImplCount;
  var start, state_count, goal;
  beforeEach(function() {
    // our state, just a simple object with a value of 0
    // athing -> count
    var athing = tools.ideas.create();
    var count_unit = tools.ideas.create();
    count = tools.ideas.create({ value: number.value(0), unit: count_unit.id });
    athing.link(links.list.thought_description, count);


    // an action that adds one to our value
    // it doesn't DO anything, but we should keep track of how many times it has been called
    //
    // since this action can be applied to any count..
    // athing -> {value: ...}
    a = new actuator.Action();
    a_c = a.requirements.addVertex(subgraph.matcher.number, { value: number.value(0, 10), unit: count_unit.id }, {transitionable:true});
    a.requirements.addEdge(
      a.requirements.addVertex(subgraph.matcher.id, athing),
      links.list.thought_description,
      a_c
    );
    a.transitions.push({ vertex_id: a_c, combine: { value: number.value(1), unit: count_unit.id } });
    actionImplCount = 0;
    actuator.actions.serialplan_count_test = function() { actionImplCount++; };
    a.action = 'serialplan_count_test';


    // the state is based on concrete ideas
    // athing -> count
    var sg = new subgraph.Subgraph();
    sg.addVertex(subgraph.matcher.id, count_unit);
    state_count = sg.addVertex(subgraph.matcher.id, count, {transitionable:true});
    sg.addEdge(
      sg.addVertex(subgraph.matcher.id, athing),
      links.list.thought_description,
      state_count
    );
    expect(subgraph.search(sg)).to.deep.equal([sg]);
    expect(sg.concrete).to.equal(true);
    start = new blueprint.State(sg, [a]);

    goal = new blueprint.State(sg.copy(), [a]);
    goal.state.vertices[state_count].data = { value: number.value(5), unit: count_unit.id };

    // we need these to be different values to check our tryTansitions result
    expect(a_c).to.not.equal(state_count);

    // I had a bit of debugging (needed a new matcher: number)
    // so I'm just gonna leave this in
    // the requirements need to match the initial state
    expect(subgraph.match(sg, a.requirements).length).to.equal(1);
  });

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(serialplan)).to.deep.equal(['Action', 'create']);
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'save']);
  });

  it('create', function() {
    // standard case, success
    var sp = serialplan.create(start, goal);
    expect(sp).to.be.ok;
    expect(sp.plans.length).to.equal(5);

    // there is no way to create a plan to get here
    // since we know this test can't finish, lets minimize the depth it has to search for our test
    var before = config.settings.astar_max_paths;
    config.settings.astar_max_paths = 10;
    sp = serialplan.create(goal, start);
    expect(sp).to.not.be.ok;
    config.settings.astar_max_paths = before;

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

  // is there a way that we can determine that a solution is unreachable without running astar to oblivion?
  // something like:
  //  'a value needs to change, and none of our plans will change that unit'
  //  'there is no way to change that unit in that direction'
  it.skip('create: fail early when impossible?');

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
      // (since the start cannot manipulate that value)
      start.state.vertices[state_count].options.transitionable = false;
      expect(sp.cost(start, goal)).to.equal(Infinity);
      start.state.vertices[state_count].options.transitionable = true;

      // using this plan costs 5
      // the distance to the goal is 0
      // using this plan will take some effort
      // ... this check doesn't really make sense
      // but the way the requirements are defined, we can start from the goal if we want to
      expect(sp.cost(goal, goal)).to.equal(5);

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

    it('save & load', function() {
      var sp = serialplan.create(start, goal);
      expect(sp).to.be.ok;

      // okay, so we save the plan for the first time
      // it should generate an idea
      expect(sp.idea).to.not.be.ok;
      sp.save();
      expect(sp.idea).to.be.ok;
      // but it shouldn't create a new one
      var id = sp.idea;
      sp.save();
      expect(sp.idea).to.equal(id);

      // this is important
      // we need to serialize the object and reload it
      ideas.close(id);

      var loaded = blueprint.load(id);
      expect(loaded).to.be.ok;

      // this is the ultimate test of the load
      expect(loaded).to.deep.equal(sp);
      // sans using the actuator in battle
      expect(loaded.tryTransition(start).length).to.equal(1);
      loaded.runBlueprint(start, loaded.tryTransition(start)[0]);
      expect(actionImplCount).to.equal(5);

      tools.ideas.clean(id);
    });
    it.skip('blueprint.load: cache currently loaded plans');
    // check sp.plans[0] === sp.plans[1]

    it('nested blueprint cost', function() {
      goal.state.vertices[state_count].data.value = number.value(3);
      var sp3 = serialplan.create(start, goal);
      expect(sp3).to.be.ok;
      expect(sp3.plans).to.deep.equal([a, a, a]);


      start.availableActions.push(sp3);
      expect(start.availableActions).to.deep.equal([a, sp3]);
      expect(start.state.vertices[state_count].data.value).to.deep.equal(number.value(0));

      goal.state.vertices[state_count].data.value = number.value(8);
      var sp = serialplan.create(start, goal);
      expect(sp).to.be.ok;
      // this pattern has no meaning, really; it's '[deterministic] chance' that they show up in this order
      // astar factors plan length into the selection
      // 3xActuator = 1xSerial, but serial is shorter, so it will pick that first
      expect(sp.plans.map(function(p) { return p.constructor.name; })).to.deep.equal([
        'SerialAction', 'ActuatorAction', 'SerialAction', 'ActuatorAction'
      ]);
      expect(sp.runCost()).to.equal(8);
      expect(sp.cost(start, goal)).to.equal(16);


      // okay, so if we want to specifically get SerialPlans, then we need to use them
      start.availableActions = [sp3];
      goal.state.vertices[state_count].data.value = number.value(6);
      sp = serialplan.create(start, goal);
      expect(sp).to.be.ok;
      expect(sp.plans.map(function(p) { return p.constructor.name; })).to.deep.equal([
        'SerialAction', 'SerialAction'
      ]);
    });
  }); // end SerialPlan
}); // end serialplan