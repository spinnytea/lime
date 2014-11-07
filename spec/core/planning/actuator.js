'use strict';
/* global describe, it, beforeEach */
var expect = require('chai').expect;
var actuator = require('../../../src/core/planning/actuator');
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var number = require('../../../src/core/planning/primitives/number');
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe.only('actuator', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'actionImpl']);
    // no need to test cost
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
    var bs, sg, p; // a blueprint with a state with a price
    var a, a_p; // an action that requires a price
    beforeEach(function() {
      // init some data
      // we have a price (a number with a unit)
      money = tools.ideas.create();
      price = tools.ideas.create({ value: number.value(10), unit: money.id });

      // create a state
      // our state is a price of 10
      // and something else random
      sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.id, money); // this is just to make our tests more valid (see p !== a_p)
      p = sg.addVertex(subgraph.matcher.id, price);
      sg.vertices[p].transitionable = true;
      bs = new blueprint.State(sg);
      expect(sg.concrete).to.equal(true);

      // create an action
      // it will add 20 to the price
      a = new actuator.Action();
      a_p = a.requirements.addVertex(subgraph.matcher.id, price);
      a.transitions.push({ vertex_id: a_p, combine: { value: number.value(20), unit: money.id } });

      // for many of our tests, p !== a_p, otherwise the test doesn't really make sense
      expect(p).to.not.equal(a_p);
    });

    it('tryTransition', function() {
      var result = a.tryTransition(bs);

      expect(result.length).to.equal(1);
      expect(Object.keys(result[0])).to.deep.equal([a_p]);
      expect(result[0][a_p]).to.equal(p);
    });

    it('runBlueprint', function() {
      var expectedData = { type: 'lime_number', value: number.value(30), unit: money.id };
      var result = a.tryTransition(bs);
      expect(result.length).to.equal(1);
      a.runBlueprint(bs, result[0]);

      // this test is redundant; it's part of how subgraphs are defined
      // it's here just a reminder
      expect(price.id).to.deep.equal(sg.vertices[p].idea.id);

      expect(sg.vertices[p].data).to.deep.equal(expectedData);
      expect(price.data()).to.deep.equal(expectedData);
    });

    it.skip('apply');

    it.skip('actionImpl');
  }); // end mock data
});