'use strict';
var expect = require('chai').expect;
var Promise = require('bluebird');
var astar = require('../../src/planning/algorithms/astar');
var actuator = require('../../src/planning/actuator');
var blueprint = require('../../src/planning/primitives/blueprint');
var config = require('../../src/config');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var planner = require('../../src/planning/planner');
var scheduler = require('../../src/planning/scheduler');
var serialplan = require('../../src/planning/serialplan');
var stub = require('../../src/planning/stub');
var subgraph = require('../../src/database/subgraph');

describe('planner', function() {
  require('../database/ideas').mock();

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(planner)).to.deep.equal(['create']);
  });

  describe('create', function() {
    var count, count_unit;
    var a, a_c, actionImplCount;
    var s;
    var start, state_count, goal;
    before(function() {
      // our state, just a simple object with a value of 0
      // athing -> count
      var athing = ideas.create();
      count_unit = ideas.create();
      count = ideas.create({ value: number.value(0), unit: count_unit.id });
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

      s = new stub.Action('create');
      var s_c = s.requirements.addVertex(subgraph.matcher.number, { value: number.value(0, 10), unit: count_unit.id }, {transitionable:true});
      s.requirements.addEdge(
        s.requirements.addVertex(subgraph.matcher.id, athing),
        links.list.thought_description,
        s_c
      );
      s.transitions.push({ vertex_id: s_c, combine: { value: number.value(5), unit: count_unit.id } });


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
      goal.state.setData(state_count, { value: number.value(5), unit: count_unit.id });
      start.availableActions = [a];
    });

    it('single', function() {
      // standard case, success
      var plan = planner.create(start, goal);
      expect(plan).to.be.an.instanceOf(serialplan.Action);
      expect(plan.plans.length).to.equal(5);
      expect(plan.runCost()).to.equal(5);

      // there is no way to create a plan to get here
      // since we know this test can't finish, lets minimize the depth it has to search for our test
      var before = config.settings.astar_max_paths;
      config.settings.astar_max_paths = 10;
      plan = planner.create(goal, start);
      expect(plan).to.equal(undefined);
      config.settings.astar_max_paths = before;

      // only one step away
      goal.state.setData(state_count, { value: number.value(1), unit: count_unit.id });
      plan = planner.create(start, goal);
      expect(plan).to.be.an.instanceOf(actuator.Action);
      expect(plan).to.equal(a);


      // right now, it creates a serial plan with no actions
      // do we want to return undefined?
      // - no because undefined usually indicates an error, or that we can't get from one place to the next
      // so instead, we create a false runCost
      // we shouldn't use this plan to get from A to A, because that's a waste of time
      //
      // we should check to see if we even need to make a plan before we try to make one
      // but if we do (for some unforseen reason), I don't want to return undefined, nor throw an exception, nor even make an impossibly large plan
      // you are already at the goal
      // if you are using a serialplan to get no where, well, it's better to just increase the runCost
      // searching for a plan should exclude this because it's a waste (but not a blocker)
      //
      // as you can probably tell, there isn't yet a definitive answer
      plan = planner.create(start, start);
      expect(plan).to.be.an.instanceOf(serialplan.Action);
      expect(plan.plans.length).to.equal(0);
      expect(plan.runCost()).to.equal(1);
      expect(plan.cost(start, goal)).to.equal(2); // start:0 goal:1 + runCost()
    });

    // XXX this is slated for deletion; it will probably be remove when we have a tiered plan
    describe('array', function() {
      var goal2;
      beforeEach(function() {
        goal2 = new blueprint.State(goal.state.copy(), [a]);
        goal2.state.setData(state_count, { value: number.value(10), unit: count_unit.id });
      });

      it('standard list of goals', function() {
        var plan = planner.create(start, [goal, goal2]);
        expect(plan).to.be.an.instanceOf(serialplan.Action);
        expect(plan.plans.length).to.equal(2);
        expect(plan.runCost()).to.equal(10);
        expect(plan.cost(start, goal2)).to.equal(20);

        var result = plan.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(2); // serial plan of length 2 needs 2 glues
        expect(result[0][0].length).to.equal(5); // this sub plan has 5 steps
        expect(result[0][1].length).to.equal(5); // this sub plan has 5 steps

        expect(count.data().value).to.deep.equal(number.value(0));
        plan.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(10));
      });

      it('same goals', function() {
        var plan = planner.create(start, [goal, goal]);
        expect(plan).to.be.an.instanceOf(serialplan.Action);
        expect(plan.plans.length).to.equal(1); // strip out the empty plan
        expect(plan.runCost()).to.equal(6);
        expect(plan.cost(start, goal)).to.equal(11);

        var result = plan.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(1);
        expect(result[0][0].length).to.equal(5);
        //expect(result[0][1].length).to.equal(0);

        expect(count.data().value).to.deep.equal(number.value(0));
        plan.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(5));
      });

      it('[goal, goal, goal2]', function() {
        var plan = planner.create(start, [goal, goal, goal2]);
        expect(plan).to.be.an.instanceOf(serialplan.Action);
        expect(plan.plans.length).to.equal(2); // strip out the empty plan
        expect(plan.runCost()).to.equal(11);
        expect(plan.cost(start, goal)).to.equal(16);

        var result = plan.tryTransition(start);
        expect(result.length).to.equal(1);
        expect(result[0].length).to.equal(2);
        expect(result[0][0].length).to.equal(5);
        //expect(result[0][1].length).to.equal(0);
        expect(result[0][1].length).to.equal(5);

        expect(count.data().value).to.deep.equal(number.value(0));
        plan.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(10));
      });

      it('unwrap the single element', function() {
        var plan = planner.create(start, [goal]);
        expect(plan).to.be.an.instanceOf(serialplan.Action);
        expect(plan.plans.length).to.equal(5);
        expect(plan.runCost()).to.equal(5);
        expect(plan.cost(start, goal)).to.equal(10);

        var result = plan.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(5); // serial plan with 5 steps

        expect(count.data().value).to.deep.equal(number.value(0));
        plan.runBlueprint(start, result[0]);
        expect(count.data().value).to.deep.equal(number.value(5));
      });

      it('cannot get to plans', function() {
        var before = config.settings.astar_max_paths;
        config.settings.astar_max_paths = 10;
        var plan = planner.create(start, [goal, goal2, goal]);
        expect(plan).to.be.equal(undefined);
        config.settings.astar_max_paths = before;
      });

      it('multiple inline goals (convenience)', function() {
        var plan = planner.create(start, goal, goal2);
        expect(plan).to.be.an.instanceOf(serialplan.Action);
        expect(plan.plans.length).to.equal(2);
        expect(plan.runCost()).to.equal(10);
        expect(plan.cost(start, goal2)).to.equal(20);

        var result = plan.tryTransition(start);
        expect(result.length).to.equal(1); // one plan that we can perform
        expect(result[0].length).to.equal(2); // serial plan of length 2 needs 2 glues
        expect(result[0][0].length).to.equal(5); // this sub plan has 5 steps
        expect(result[0][1].length).to.equal(5); // this sub plan has 5 steps

        expect(count.data().value).to.deep.equal(number.value(0));
        plan.runBlueprint(start, result[0]);
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

    it.skip('with stubs at not CREATE');

    it('with stubs at CREATE', function(done) {
      start.availableActions.push(s);
      goal.state.setData(state_count, { value: number.value(10), unit: count_unit.id });

      // if we try to find a path using astar, then to actions should contain stubs
      var path = astar.search(start, goal);
      expect(path).to.not.equal(undefined);
      expect(path.actions.length).to.equal(2);
      expect(path.actions[0]).to.be.an.instanceOf(stub.Action);
      expect(path.actions[1]).to.be.an.instanceOf(stub.Action);
      expect(path.actions[1]).to.not.be.an.instanceOf(actuator.Action);

      // but, if we use our super fancy planner, then it will solve the stubs for us
      var plan = planner.create(start, goal);
      expect(plan).to.be.an.instanceOf(serialplan.Action);
      expect(plan.plans.length).to.equal(2);
      expect(plan.plans[0]).to.be.an.instanceOf(serialplan.Action);
      expect(plan.plans[0].plans.length).to.equal(5);
      expect(plan.plans[0].plans[1]).to.be.an.instanceOf(actuator.Action);
      expect(plan.plans[1]).to.be.an.instanceOf(serialplan.Action);
      expect(plan.plans[1].plans.length).to.equal(5);
      expect(plan.plans[1].plans[1]).to.be.an.instanceOf(actuator.Action);
      expect(plan.transitions).to.deep.equal([]);
      expect(plan.plans[0].transitions).to.deep.equal(s.transitions);
      expect(plan.plans[1].transitions).to.deep.equal(s.transitions);

      // get the glue so we can schedule the blueprint
      var glues = plan.tryTransition(start);
      expect(glues.length).to.equal(1); // all possible results
      var glue = glues[0]; // the specific glue
      expect(glue.length).to.equal(2);
      expect(glue[0]).to.be.an.instanceOf(Array);
      expect(glue[0].length).to.equal(5);
      expect(glue[1]).to.be.an.instanceOf(Array);
      expect(glue[1].length).to.equal(5);

      //
      //
      //

      expect(start.state.getData(state_count).value).to.deep.equal(number.value(0));

      plan.scheduleBlueprint(start, glue).then(function() {
        expect(start.state.getData(state_count).value).to.deep.equal(number.value(10));
        expect(actionImplCount).to.equal(10);
      }).finally(done).catch(done);

      expect(start.state.getData(state_count).value).to.deep.equal(number.value(1));

      scheduler.check().then(function() {
        expect(start.state.getData(state_count).value).to.deep.equal(number.value(2));
        return scheduler.check()
          .then(scheduler.check)
          .then(scheduler.check);
      }).then(function() {
        expect(start.state.getData(state_count).value).to.deep.equal(number.value(5));
        return scheduler.check();
      }).then(function() {
        return Promise.resolve(); // switch to the new serial plan
      }).then(function() {
        expect(start.state.getData(state_count).value).to.deep.equal(number.value(6));
        return scheduler.check()
          .then(scheduler.check)
          .then(scheduler.check)
          .then(scheduler.check);
      }).then(function() {
        expect(start.state.getData(state_count).value).to.deep.equal(number.value(10));
        return scheduler.check();
      }).catch(done);
    });

    it.skip('with stubs at CREATE and defined sub actions');

    it('stub failure at CREATE', function() {
      goal.state.setData(state_count, { value: number.value(10), unit: count_unit.id });

      // just to verify our test
      // we can create a plan with start and goal
      expect(planner.create(start, goal)).to.not.equal(undefined);

      // now, if our start only has stubs
      // then our plan comes back as undefined
      start.availableActions = [s];
      expect(planner.create(start, goal)).to.equal(undefined);
    });

    it.skip('mismatch between stubs and actuators', function() {
      // does this matter?
      // should we just stop the plan?
      // will it always be invalid?
      // most fo the time we will probably need to recover due to inconsistencies between the plan/world states
    });

    // is there a way that we can determine that a solution is unreachable without running astar to oblivion?
    // something like:
    //  'a value needs to change, and none of our plans will change that unit'
    //  'there is no way to change that unit in that direction'
    it.skip('fail early when impossible?');
  }); // end create
}); // end planner