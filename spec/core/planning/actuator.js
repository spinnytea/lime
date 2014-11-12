'use strict';
/* global describe, it, beforeEach */
var expect = require('chai').expect;
var actuator = require('../../../src/core/planning/actuator');
var astar = require('../../../src/core/planning/algorithms/astar');
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var links = require('../../../src/core/database/links');
var number = require('../../../src/core/planning/primitives/number');
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe('actuator', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'actionImpl']);
  });

  it('runCost', function() {
    var a = new actuator.Action();
    expect(a.runCost()).to.equal(0);

    // we 'should' pass in a valid transition
    // but then we 'should' setup everything else
    a = new actuator.Action();
    a.transitions.push({});
    expect(a.runCost()).to.equal(1);
  });

  describe('mock data', function() {
    var money, price; // our idea graph is .. money
    var bs, p; // a blueprint with a state with a price
    var a, a_a, a_p, actionImplCount; // an action that requires a price
    beforeEach(function() {
      // init some data
      // we have a price (a number with a unit)
      var apple = tools.ideas.create();
      money = tools.ideas.create();
      price = tools.ideas.create({ value: number.value(10), unit: money.id });
      apple.link(links.list.thought_description, price);

      // create an action
      // it will add 20 to the price
      a = new actuator.Action();
      a_p = a.requirements.addVertex(subgraph.matcher.data.number, { value: number.value(0, Infinity), unit: money.id }, true);
      a_a = a.requirements.addVertex(subgraph.matcher.id, apple);
      a.requirements.addEdge(
        a_a,
        links.list.thought_description,
        a_p
      );
      a.transitions.push({ vertex_id: a_p, combine: { value: number.value(20), unit: money.id } });
      actionImplCount = 0;
      a.actionImpl = function() { actionImplCount++; };

      // create a state
      // our state is a price of 10
      // and something else random
      var sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.id, money); // this is just to make our tests more valid (see p !== a_p)
      p = sg.addVertex(subgraph.matcher.id, price, true);
      sg.addEdge(
        sg.addVertex(subgraph.matcher.id, apple),
        links.list.thought_description,
        p
      );
      expect(subgraph.search(sg)).to.deep.equal([sg]);
      expect(sg.concrete).to.equal(true);
      bs = new blueprint.State(sg, [a]);

      // for many of our tests, p !== a_p, otherwise the test doesn't really make sense
      expect(p).to.not.equal(a_p);
    });

    it('tryTransition', function() {
      expect(actionImplCount).to.equal(0);
      var result = a.tryTransition(bs);

      expect(result.length).to.equal(1);
      expect(Object.keys(result[0])).to.deep.equal([a_p, a_a]);
      expect(result[0][a_p]).to.equal(p);
      expect(actionImplCount).to.equal(0);
    });

    it('runBlueprint', function() {
      expect(actionImplCount).to.equal(0);
      var expectedData = { type: 'lime_number', value: number.value(30), unit: money.id };
      var result = a.tryTransition(bs);
      expect(result.length).to.equal(1);
      a.runBlueprint(bs, result[0]);

      expect(bs.state.vertices[p].data).to.deep.equal(expectedData); // vertex data is updated
      expect(price.data()).to.deep.equal(expectedData); // idea data has not
      expect(actionImplCount).to.equal(1); // action has been called
    });

    it('cost', function() {
      expect(actionImplCount).to.equal(0);

      var goal = new blueprint.State(bs.state.copy(), [a]);
      goal.state.vertices[p].data = { value: number.value(30), unit: money.id };

      // distance of 20, action costs 1
      expect(a.cost(bs, goal)).to.equal(21);

      // action cannot be applied
      a.requirements.vertices[a_p].matchData.value = number.value(0);
      expect(a.cost(bs, goal)).to.equal(Infinity);

      expect(actionImplCount).to.equal(0);
    });

    it('apply', function() {
      expect(actionImplCount).to.equal(0);
      var result = a.tryTransition(bs);
      expect(result.length).to.equal(1);
      var bs2 = a.apply(bs, result[0]);

      expect(bs2).to.not.equal(bs);

      // bs should not be changed
      expect(bs.state.vertices[p].data).to.deep.equal({ value: number.value(10), unit: money.id });

      // bs2 should be updated
      expect(bs2.state.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });

      // the price data should not be updated (it matches the original vertex data)
      expect(price.data()).to.deep.equal({ value: number.value(10), unit: money.id });

      // this shouldn't call the actionImpl
      expect(actionImplCount).to.equal(0);
    });

    it('basic planning', function() {
      expect(astar).to.have.property('search');

      var goal = new blueprint.State(bs.state.copy(), bs.availableActions);
      goal.state.vertices[p].data = { value: number.value(50), unit: money.id };

      expect(bs.state.vertices[p].data).to.deep.equal({ value: number.value(10), unit: money.id });
      expect(goal.state.vertices[p].data).to.deep.equal({ value: number.value(50), unit: money.id });
      expect(bs.matches(goal)).to.equal(false);

      var path = astar.search(bs, goal);

      expect(path).to.be.ok;
      expect(path.states.length).to.equal(3);
      expect(path.states[0].state.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(10), unit: money.id });
      expect(path.states[1].state.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
      expect(path.states[2].state.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(50), unit: money.id });

      expect(path.actions).to.deep.equal([a, a]);
    });
  }); // end mock data

  describe('save & load', function() {
    it.skip('loaded can be used in a plan');
  }); // end save & load
}); // end actuator