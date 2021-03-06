'use strict';
var expect = require('chai').expect;

var actuator = require('../../src/planning/actuator');
var blueprint = require('../../src/planning/primitives/blueprint');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var stub = require('../../src/planning/stub');
var subgraph = require('../../src/database/subgraph');

describe('stub', function() {
  require('../database/ideas').mock();

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(stub)).to.deep.equal(['Action', 'solveAt', 'createStates']);
    expect(Object.keys(stub.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'scheduleBlueprint', 'cost', 'apply', 'save', 'prepSave']);
  });

  it('invalid solveAt', function() {
    var at = 'invalid solve at';
    expect(stub.solveAt.indexOf(at)).to.equal(-1);

    expect(function() {
      new stub.Action(at); // jshint ignore:line
    }).to.throw('solveAt must be defined and well known');
  });

  describe('Action', function() {
    var apple, money, price; // our idea graph is about .. money
    var s, s_p, s_a; // an action that requires a price
    var bs, bs_a, bs_p; // a blueprint with a state with a price
    before(function() {
      // init some data
      // we have a price (a number with a unit)
      apple = ideas.create();
      money = ideas.create();
      price = ideas.create({ value: number.value(10), unit: money.id });
      apple.link(links.list.thought_description, price);

      s = new stub.Action('create');
      s_p = s.requirements.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: money.id }, {transitionable:true});
      s_a = s.requirements.addVertex(subgraph.matcher.id, apple);
      s.requirements.addEdge(s_a, links.list.thought_description, s_p);
      s.transitions.push({ vertex_id: s_p, combine: { value: number.value(20), unit: money.id } });

      // create a state
      // our state is a price of 10
      // and something else random
      var sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.id, money); // this is just to make our tests more valid (see bs_p !== a_p)
      bs_a = sg.addVertex(subgraph.matcher.id, apple);
      bs_p = sg.addVertex(subgraph.matcher.id, price, {transitionable:true});
      sg.addEdge(bs_a, links.list.thought_description, bs_p);
      expect(subgraph.search(sg)).to.deep.equal([sg]);
      expect(sg.concrete).to.equal(true);
      bs = new blueprint.State(sg, [s]);
    });

    it('runCost', function() {
      expect(s.runCost).to.equal(actuator.Action.prototype.runCost);
    });

    it('tryTransition', function() {
      expect(s.tryTransition).to.equal(actuator.Action.prototype.tryTransition);
    });

    it('runBlueprint', function() {
      // actuator.Action.prototype.runBlueprint; we want it to throw the error
      //
      // this should never implement runBlueprint because you cannot actually run it
      // the ONLY exception would be ...
      //   if solveAt === 'runtime'
      //   this would imply that we want to resolve it every time we run, that it should never actually be saved
      //   we wouldn't use solveAt === 'runBlueprint' because that implies that serialplan et al should handle it
      expect(function() {
        s.runBlueprint();
      }).to.throw('StubAction does not implement runBlueprint');
    });

    it('scheduleBlueprint', function() {
      // same reason as runBlueprint
      expect(function() {
        s.scheduleBlueprint();
      }).to.throw('StubAction does not implement scheduleBlueprint');
    });

    it('cost', function() {
      expect(s.cost).to.equal(blueprint.Action.prototype.cost);
    });

    it('apply', function() {
      expect(s.apply).to.equal(actuator.Action.prototype.apply);
    });

    it('save', function() {
      expect(s.save).to.equal(actuator.Action.prototype.save);
    });

    it('prepSave & loader', function() {
      // make a fake ID for this test
      // (pretend it's gone through s.save())
      s.idea = '_test_';

      var data = s.prepSave();

      // the data needs to be able to go through
      expect(JSON.parse(JSON.stringify(data))).to.deep.equal(data);

      var loaded = blueprint.loaders.StubAction(data);
      expect(loaded).to.be.an.instanceOf(stub.Action);
      expect(loaded).to.deep.equal(s); // this is our real test

      //

      // now use the stub in battle!
      var results = loaded.tryTransition(bs);
      expect(results.length).to.equal(1);
      expect(price.data().value).to.deep.equal(number.value(10));
      var bs_next = loaded.apply(bs, results[0]);
      expect(bs_next.state.getData(bs_p).value).to.deep.equal(number.value(30));
    });

    it.skip('save & load');
  }); // end Action

  it.skip('createStates', function() {
    // planner.create and astar.units.step both need to create a start/goal
    // that seems to be done in a standard way, so it should be done within stub
  });
}); // end stub