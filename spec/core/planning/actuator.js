'use strict';
/* global describe, it, beforeEach */
var expect = require('chai').expect;
var actuator = require('../../../src/core/planning/actuator');
var astar = require('../../../src/core/planning/algorithms/astar');
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var ideas = require('../../../src/core/database/ideas');
var links = require('../../../src/core/database/links');
var number = require('../../../src/core/planning/primitives/number');
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe('actuator', function() {
  it.skip('can we reduce the setup for these tests; can we use "before" instead of "beforeEach"');
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(actuator)).to.deep.equal(['Action', 'actions', 'list']);
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'save']);
  });

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
    a_p = a.requirements.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: money.id }, true);
    a_a = a.requirements.addVertex(subgraph.matcher.id, apple);
    a.requirements.addEdge(
      a_a,
      links.list.thought_description,
      a_p
    );
    a.transitions.push({ vertex_id: a_p, combine: { value: number.value(20), unit: money.id } });
    actionImplCount = 0;
    actuator.actions.actuator_count_test = function() { actionImplCount++; };
    a.action = 'actuator_count_test';

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

  it('runCost', function() {
    expect(a.runCost()).to.equal(1);

    a = new actuator.Action();
    expect(a.runCost()).to.equal(0);
  });

  it('tryTransition', function() {
    expect(actionImplCount).to.equal(0);
    var result = a.tryTransition(bs);

    expect(result.length).to.equal(1);
    expect(Object.keys(result[0])).to.deep.equal([a_p+'', a_a+'']);
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
  it.skip('replace_id translation across actuator glue');

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

  it('save & load', function() {
    // before an action is saved, there is no idea
    expect(a.idea).to.not.be.ok;
    a.save();
    expect(a.idea).to.be.ok;
    // if we save again, it should use the same idea
    var id = a.idea;
    a.save();
    expect(a.idea).to.equal(id);

    // this is important, we need to serialize the object
    ideas.close(id);

    var loaded = blueprint.load(id);
    expect(loaded).to.be.ok;

    // this is the ultimate test of the load
    expect(loaded).to.deep.equal(a);
    // sans using the actuator in battle
    expect(loaded.tryTransition(bs).length).to.equal(1);
    loaded.runBlueprint(bs, loaded.tryTransition(bs)[0]);
    expect(actionImplCount).to.equal(1);

    tools.ideas.clean(id);
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

  // we need to test a blueprint function
  it('list', function() {
    // create a node that is the base of blueprints
    // save this in config.data
    // when we do a blueprint.save(), hook it up as a child
    // list plans should load the ones we have saved

    // save our actuator
    a.save();
    expect(a.idea).to.be.ok;

    // attach it to a dummy context
    var context = ideas.create();
    ideas.load(a.idea).link(links.list.context, context);


    // search for our actuator
    // (basic)
    // if we have data from a use case, so we need to ensure this actuator is included in the list
    var list = actuator.list();
    expect(list.length).to.be.gt(0);
    expect(list.map(function(i) { return i.id; })).to.include(a.idea);

    // search for our actuator
    // (ID string)
    list = actuator.list(context.id);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);

    // search for our actuator
    // (proxy idea)
    list = actuator.list(context);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);

    // search for our actuator
    // ([ID string])
    list = actuator.list([context.id]);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);

    // search for our actuator
    // ([proxy idea])
    list = actuator.list([context]);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);
  });
}); // end actuator