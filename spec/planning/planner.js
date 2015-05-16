'use strict';
/* global describe, it, before, beforeEach */
var expect = require('chai').expect;
var actuator = require('../../src/planning/actuator');
var blueprint = require('../../src/planning/primitives/blueprint');
var config = require('../../config');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var planner = require('../../src/planning/planner');
var serialplan = require('../../src/planning/serialplan');
var subgraph = require('../../src/database/subgraph');
var tools = require('../testingTools');

describe('planner', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(planner)).to.deep.equal(['create']);
  });

  describe('create', function() {
    var count;
    var a, a_c, actionImplCount;
    var start, state_count, goal;
    before(function() {
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
      goal.state.setData(state_count, { value: number.value(5), unit: count_unit.id });

      // we need these to be different values to check our tryTansitions result
      expect(a_c).to.not.equal(state_count);

      // I had a bit of debugging (needed a new matcher: number)
      // so I'm just gonna leave this in
      // the requirements need to match the initial state
      expect(subgraph.match(sg, a.requirements).length).to.equal(1);
    });
    // reset our data from our tests
    beforeEach(function() {
      var data = count.data();
      count.update({ value: number.value(0), unit: data.unit });
      actionImplCount = 0;
      start.state.deleteData();
      goal.state.getData(state_count).value = number.value(5);
    });

    it('single', function() {
      // standard case, success
      var sp = planner.create(start, goal);
      expect(sp).to.be.an.instanceOf(serialplan.Action);
      expect(sp.plans.length).to.equal(5);
      expect(sp.runCost()).to.equal(5);

      // there is no way to create a plan to get here
      // since we know this test can't finish, lets minimize the depth it has to search for our test
      var before = config.settings.astar_max_paths;
      config.settings.astar_max_paths = 10;
      sp = planner.create(goal, start);
      expect(sp).to.equal(undefined);
      config.settings.astar_max_paths = before;

      // only one step away
      goal.state.getData(state_count).value = number.value(1);
      sp = planner.create(start, goal);
      expect(sp).to.be.an.instanceOf(actuator.Action);
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
      sp = planner.create(start, start);
      expect(sp).to.be.an.instanceOf(serialplan.Action);
      expect(sp.plans.length).to.equal(0);
      expect(sp.runCost()).to.equal(1);
      expect(sp.cost(start, goal)).to.equal(2); // start:0 goal:1 + runCost()
    });

    // XXX this is slated for deletion; it will probably be remove when we have a tiered plan
    describe('array', function() {
      var goal2;
      beforeEach(function() {
        goal2 = new blueprint.State(goal.state.copy(), [a]);
        goal2.state.getData(state_count).value = number.value(10);
      });

      it('standard list of goals', function() {
        var sp = planner.create(start, [goal, goal2]);
        expect(sp).to.be.an.instanceOf(serialplan.Action);
        expect(sp.plans.length).to.equal(2);
        expect(sp.runCost()).to.equal(10);
        expect(sp.cost(start, goal2)).to.equal(20);

        var result = sp.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(2); // serial plan of length 2 needs 2 glues
        expect(result[0][0].length).to.equal(5); // this sub plan has 5 steps
        expect(result[0][1].length).to.equal(5); // this sub plan has 5 steps

        expect(count.data().value).to.deep.equal(number.value(0));
        sp.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(10));
      });

      it('same goals', function() {
        var sp = planner.create(start, [goal, goal]);
        expect(sp).to.be.an.instanceOf(serialplan.Action);
        expect(sp.plans.length).to.equal(2);
        expect(sp.runCost()).to.equal(6);
        expect(sp.cost(start, goal)).to.equal(11);

        var result = sp.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(2);
        expect(result[0][0].length).to.equal(5);
        expect(result[0][1].length).to.equal(0);

        expect(count.data().value).to.deep.equal(number.value(0));
        sp.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(5));
      });

      it('[goal, goal, goal2]', function() {
        var sp = planner.create(start, [goal, goal, goal2]);
        expect(sp).to.be.an.instanceOf(serialplan.Action);
        expect(sp.plans.length).to.equal(3);
        expect(sp.runCost()).to.equal(11);
        expect(sp.cost(start, goal)).to.equal(16);

        var result = sp.tryTransition(start);
        expect(result.length).to.equal(1);
        expect(result[0].length).to.equal(3);
        expect(result[0][0].length).to.equal(5);
        expect(result[0][1].length).to.equal(0);
        expect(result[0][2].length).to.equal(5);

        expect(count.data().value).to.deep.equal(number.value(0));
        sp.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(10));
      });

      it('unwrap the single element', function() {
        var sp = planner.create(start, [goal]);
        expect(sp).to.be.an.instanceOf(serialplan.Action);
        expect(sp.plans.length).to.equal(5);
        expect(sp.runCost()).to.equal(5);
        expect(sp.cost(start, goal)).to.equal(10);

        var result = sp.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(5); // serial plan with 5 steps

        expect(count.data().value).to.deep.equal(number.value(0));
        sp.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(5));
      });

      it('cannot get to plans', function() {
        var before = config.settings.astar_max_paths;
        config.settings.astar_max_paths = 10;
        var sp = planner.create(start, [goal, goal2, goal]);
        expect(sp).to.be.equal(undefined);
        config.settings.astar_max_paths = before;
      });

      it('multiple inline goals (convenience)', function() {
        var sp = planner.create(start, goal, goal2);
        expect(sp).to.be.an.instanceOf(serialplan.Action);
        expect(sp.plans.length).to.equal(2);
        expect(sp.runCost()).to.equal(10);
        expect(sp.cost(start, goal2)).to.equal(20);

        var result = sp.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(2); // serial plan of length 2 needs 2 glues
        expect(result[0][0].length).to.equal(5); // this sub plan has 5 steps
        expect(result[0][1].length).to.equal(5); // this sub plan has 5 steps

        expect(count.data().value).to.deep.equal(number.value(0));
        sp.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(10));
      });
    }); // end array

    it('undefined arguments', function() {
      // one positive case (not that it really belongs here)
      expect(planner.create(start, goal)).to.be.an.instanceOf(serialplan.Action);

      // okay, the negative cases
      expect(planner.create(undefined, undefined)).to.equal(undefined);
      expect(planner.create(start, undefined)).to.equal(undefined);
      expect(planner.create(undefined, goal)).to.equal(undefined);
      expect(planner.create(undefined, undefined, goal)).to.equal(undefined);
    });

    // is there a way that we can determine that a solution is unreachable without running astar to oblivion?
    // something like:
    //  'a value needs to change, and none of our plans will change that unit'
    //  'there is no way to change that unit in that direction'
    it.skip('fail early when impossible?');
  }); // end create
}); // end planner
