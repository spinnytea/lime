'use strict';
/* global describe, it */
var expect = require('chai').expect;
var actuator = require('../../../src/core/planning/actuator');
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var number = require('../../../src/core/planning/primitives/number');
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe.only('actuator', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply']);
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

  it('tryTransition', function() {
    // init some data
    // we have a price (a number with a unit)
    var money = tools.ideas.create();
    var price = tools.ideas.create({ value: number.value(10), unit: money.id });

    // create a state
    // our state is a price of 10
    // and something else random
    var sg = new subgraph.Subgraph();
    sg.addVertex(subgraph.matcher.id, money); // put
    var p = sg.addVertex(subgraph.matcher.id, price);
    var bs = new blueprint.State(sg);
    expect(sg.concrete).to.equal(true);

    // create an action
    // it will add 20 to the price
    var a = new actuator.Action();
    var a_p = a.requirements.addVertex(subgraph.matcher.id, price);
    a.transitions.push({ vertex_id: a_p, combine: { value: number.value(20), unit: money.id } });

    expect(p).to.not.equal(a_p);
    var result = a.tryTransition(bs);

    // AC: this is specifically the interface of actuator.tryTransition
    expect(result.length).to.equal(1);
    expect(Object.keys(result[0])).to.deep.equal([a_p]);
    expect(result[0][a_p]).to.equal(p);
  });

  it.skip('runBlueprint');

  it.skip('apply');
});