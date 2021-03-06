'use strict';
var _ = require('lodash');
var expect = require('chai').expect;
var Promise = require('bluebird');
var actuator = require('../../src/planning/actuator');
var blueprint = require('../../src/planning/primitives/blueprint');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var scheduler = require('../../src/planning/scheduler');
var serialplan = require('../../src/planning/serialplan');
var subgraph = require('../../src/database/subgraph');

describe('serialplan', function() {
  require('../database/ideas').mock();

  it.skip('a tiered plan is a serial plan', function() {
    // do we just add a boolean?
    // do we just save the goals?

    // when we find a tiered plan that does what we need, we can try to reuse it, or re-plan the sections
    // when do we plan the sections in the first place? up front? when we get to them?
    // maybe this is a different plan type?
    // do we think of this in terms of "concrete"?
    // does the whole thing need to be concrete, or just branches?
  });

  var count, count_unit;
  var a, a_c, actionImplCount;
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

    // undo the effects of the copy
    // this is for 'save & load' since saving will flatten and we don't have a smarter comparison
    if(a.requirements._matchParent) {
      a.requirements._match = a.requirements._matchParent.obj;
      a.requirements._matchParent = undefined;
    }
    if(a.requirements._dataParent) {
      a.requirements._data = a.requirements._dataParent.obj;
      a.requirements._dataParent = undefined;
    }
  });

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(serialplan)).to.deep.equal(['Action']);
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'scheduleBlueprint', 'cost', 'apply', 'save', 'prepSave']);
  });

  describe('SerialPlan', function() {
    it('runCost', function() {
      var sp = new serialplan.Action([a, a, a, a, a]);
      expect(sp.runCost()).to.equal(5);

      sp = new serialplan.Action([]);
      expect(sp.runCost()).to.equal(1);
    });

    it('tryTransition', function() {
      var sp = new serialplan.Action([a, a, a, a, a]);
      var glues = sp.tryTransition(start);
      expect(actionImplCount).to.equal(0);

      expect(glues.length).to.equal(1); // there is only possible path
      expect(glues[0].length).to.equal(sp.plans.length); // there are 5 steps in the path
      // each of these has a mapping from a_c to state_count
      expect(_.map(glues[0], a_c)).to.deep.equal([state_count, state_count, state_count, state_count, state_count]);

      // we should be able to try our transition from the goal
      // (this is just trying things out; doesn't mean it will take us places)
      glues = sp.tryTransition(goal);
      expect(glues.length).to.equal(1);
      expect(_.map(glues[0], a_c)).to.deep.equal([state_count, state_count, state_count, state_count, state_count]);

      // something we can't apply the transition to
      // so the array is empty
      glues = sp.tryTransition(new blueprint.State(new subgraph.Subgraph(), []));
      expect(glues).to.deep.equal([]);

      // if the serial plan doesn't have any plans, then it should still return with a result
      sp = new serialplan.Action([]);
      glues = sp.tryTransition(start);
      expect(glues.length).to.equal(0);

      expect(actionImplCount).to.equal(0);
    });

    it('runBlueprint', function() {
      var sp = new serialplan.Action([a, a, a, a, a]);
      var glues = sp.tryTransition(start);
      expect(glues.length).to.equal(1);
      expect(actionImplCount).to.equal(0);

      sp.runBlueprint(start, glues[0]);

      // the state and the ideas have been updated
      expect(start.state.getData(state_count).value).to.deep.equal(number.value(5));
      expect(count.data().value).to.deep.equal(number.value(5));
      expect(actionImplCount).to.equal(5);
    });

    describe('scheduleBlueprint', function() {
      it('basic', function(done) {
        var sp = new serialplan.Action([new serialplan.Action([a, a, a, a]), a]);
        var glues = sp.tryTransition(start);
        expect(glues.length).to.equal(1);
        expect(actionImplCount).to.equal(0);

        sp.scheduleBlueprint(start, glues[0], []).then(function() {

          // the state and the ideas have been updated
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(5));
          expect(count.data().value).to.deep.equal(number.value(5));
          expect(actionImplCount).to.equal(5);

        }, function() {
          throw new Error('this should not fail');
        }).finally(done).catch(done);

        expect(actionImplCount).to.equal(1); // the first step runs immediately
        scheduler.check().then(function() {
          expect(actionImplCount).to.equal(2);
          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(3);
          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(4);
          return scheduler.check();
        }).then(function() {
          // this is basically a noop in the test while the promise chain resolves
          // the serial plan promise chain and the test promise chain are trading time in the js execution schedule
          // at this step, the nested serial plan is unwinding
          expect(actionImplCount).to.equal(4);
          return Promise.resolve();
        }).then(function() {
          expect(actionImplCount).to.equal(5);
          return scheduler.check();
        }).catch(done);
      });

      it('failure', function(done) {
        // sub plan doesn't have any transitions defined
        // so this should just fail
        var sp = new serialplan.Action([new serialplan.Action([a, a, a, a]), a]);
        var glues = sp.tryTransition(start);
        expect(glues.length).to.equal(1);
        expect(actionImplCount).to.equal(0);

        sp.scheduleBlueprint(start, glues[0], []).then(function() {
          throw new Error('this should not pass');
        }, function() {
          expect(actionImplCount).to.equal(3); // this is when we trigger the failure
          expect(count.data().value).to.deep.equal(number.value(1)); // this is how the data is set below
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(1)); // this is how the data is set below
        }).finally(done).catch(done);

        expect(actionImplCount).to.equal(1); // the first step runs immediately
        expect(count.data().value).to.deep.equal(number.value(1));
        expect(start.state.getData(state_count).value).to.deep.equal(number.value(1));
        scheduler.check().then(function() {
          expect(actionImplCount).to.equal(2);
          expect(count.data().value).to.deep.equal(number.value(2));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(2));
          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(3);
          expect(count.data().value).to.deep.equal(number.value(3));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(3));

          var data = count.data();
          data.value.l = 1;
          data.value.r = 1;

          count.update(data);
          start.state.setData(state_count, data);

          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(3);
          return Promise.resolve();
        }).catch(done);
      });

      it('plan recovery', function(done) {
        // replan when something goes wrong
        var sub_sp = new serialplan.Action([a, a, a, a]);
        sub_sp.transitions.push({ vertex_id: a_c, combine: { value: number.value(4), unit: count_unit.id } });
        var sp = new serialplan.Action([sub_sp, a]);
        var glues = sp.tryTransition(start);
        expect(glues.length).to.equal(1);
        expect(actionImplCount).to.equal(0);

        sp.scheduleBlueprint(start, glues[0], []).then(function() {

          // the state and the ideas have been updated
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(5));
          expect(count.data().value).to.deep.equal(number.value(5));
          expect(actionImplCount).to.equal(7);

        }, function() {
          throw new Error('this should not fail');
        }).finally(done);

        expect(actionImplCount).to.equal(1); // the first step runs immediately
        expect(count.data().value).to.deep.equal(number.value(1));
        expect(start.state.getData(state_count).value).to.deep.equal(number.value(1));
        scheduler.check().then(function() {
          expect(actionImplCount).to.equal(2);
          expect(count.data().value).to.deep.equal(number.value(2));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(2));
          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(3);
          expect(count.data().value).to.deep.equal(number.value(3));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(3));

          var data = count.data();
          data.value.l = 1;
          data.value.r = 1;

          count.update(data);
          start.state.setData(state_count, data);

          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(4);
          expect(count.data().value).to.deep.equal(number.value(2));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(2));
          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(5);
          expect(count.data().value).to.deep.equal(number.value(3));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(3));
          return scheduler.check();
        }).then(function() {
          expect(actionImplCount).to.equal(6);
          expect(count.data().value).to.deep.equal(number.value(4));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(4));
          return scheduler.check();
        }).then(function() {
          // this is basically a noop in the test while the promise chain resolves
          // the serial plan promise chain and the test promise chain are trading time in the js execution schedule
          // at this step, the nested serial plan is unwinding
          expect(actionImplCount).to.equal(6);
          return Promise.resolve();
        }).then(function() {
          // this is basically a noop in the test while the promise chain resolves
          // the serial plan promise chain and the test promise chain are trading time in the js execution schedule
          // at this step, the nested serial plan is unwinding
          expect(actionImplCount).to.equal(6);
          return Promise.resolve();
        }).then(function() {
          expect(actionImplCount).to.equal(7);
          expect(count.data().value).to.deep.equal(number.value(5));
          expect(start.state.getData(state_count).value).to.deep.equal(number.value(5));
          return scheduler.check();
        }).catch(done);
      });

      it.skip('plan failed recovery'); // set the data.value.l to -1
    }); // end scheduleBlueprint

    it('cost', function() {
      var sp = new serialplan.Action([a, a, a, a, a]);
      expect(sp.cost(start, goal)).to.equal(10);

      // so start cannot get to the goal
      // (since the start cannot manipulate that value)
      start.state.getMatch(state_count).options.transitionable = false;
      expect(sp.cost(start, goal)).to.equal(Infinity);
      start.state.getMatch(state_count).options.transitionable = true;

      // using this plan costs 5
      // the distance to the goal is 0
      // using this plan will take some effort
      // ... this check doesn't really make sense
      // but the way the requirements are defined, we can start from the goal if we want to
      expect(sp.cost(goal, goal)).to.equal(5);

      // if ther serial plan doesn't have any actions, then it has not starting requirements
      // in which case, it can't be applied to anything
      sp = new serialplan.Action([]);
      expect(sp.cost(start, goal)).to.equal(Infinity);
      expect(sp.cost(start, start)).to.equal(Infinity);

      // there are some cases where we want a serial plan to be a noop
      // these cases will have starting requirements, but no actions
      sp = new serialplan.Action([]);
      sp.requirements = start.state;
      expect(sp.cost(start, start)).to.equal(1);
    });

    it('apply', function() {
      var sp = new serialplan.Action([a, a, a, a, a]);
      var glues = sp.tryTransition(start);
      expect(glues.length).to.equal(1);
      expect(actionImplCount).to.equal(0);

      var result = sp.apply(start, glues[0]);

      // this is a new experimental state
      expect(result).to.not.equal(start);
      expect(result.state.getData(state_count).value).to.deep.equal(number.value(5));

      // the state and the ideas have not changed
      expect(start.state.getData(state_count).value).to.deep.equal(number.value(0));
      expect(count.data().value).to.deep.equal(number.value(0));
      expect(actionImplCount).to.equal(0);
    });

    it('prepSave & loader', function() {
      var sp = new serialplan.Action([a, a, a, a, a]);
      // make a fake ID for this test
      // (pretend it's gone through s.save())
      sp.idea = '_test_';

      var data = sp.prepSave();

      // the data needs to be able to go through
      expect(JSON.parse(JSON.stringify(data))).to.deep.equal(data);


      var loaded = blueprint.loaders.SerialAction(data);
      expect(loaded).to.be.an.instanceOf(serialplan.Action);
      expect(loaded).to.deep.equal(sp); // this is our real test

      //

      // now use the stub in battle!
      expect(loaded.tryTransition(start).length).to.equal(1);
      loaded.runBlueprint(start, loaded.tryTransition(start)[0]);
      expect(actionImplCount).to.equal(5);
    });
    it.skip('blueprint.load: cache currently loaded plans');
    // check sp.plans[0] === sp.plans[1]

    it.skip('save & load');

    it('nested blueprint', function() {
      var sp2 = new serialplan.Action([a, a, a]);
      var sp = new serialplan.Action([sp2, sp2, a, a]);
      goal.state.setData(state_count, { value: number.value(8), unit: count_unit.id });

      // this pattern has no meaning, really; it's '[deterministic] chance' that they show up in this order
      // astar factors plan length into the selection
      // 3xActuator = 1xSerial, but serial is shorter, so it will pick that first
      // XXX a better test would be to count the number of times each appears
      expect(sp.plans.map(function(p) { return p.constructor.name; })).to.deep.equal([
        'SerialAction', 'SerialAction', 'ActuatorAction', 'ActuatorAction'
      ]);
      expect(sp.runCost()).to.equal(8);
      expect(sp.cost(start, goal)).to.equal(16);
      var result = sp.tryTransition(start);
      expect(result.length).to.equal(1); // only 1 plan
      expect(result[0].length).to.equal(4); // this plan has 4 parts
      expect(result[0].map(function(p) { return p.constructor.name; })).to.deep.equal([
        'Array', 'Array', 'Object', 'Object'
      ]);


      sp = new serialplan.Action([sp2, sp2]);
      goal.state.setData(state_count, { value: number.value(6), unit: count_unit.id });
      expect(sp.plans.map(function(p) { return p.constructor.name; })).to.deep.equal([
        'SerialAction', 'SerialAction'
      ]);
      expect(sp.runCost()).to.equal(6);
      expect(sp.cost(start, goal)).to.equal(12);
    });

    it.skip('nested blueprint: runBlueprint, apply, save & load');
  }); // end SerialPlan
}); // end serialplan