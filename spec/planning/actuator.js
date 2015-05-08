'use strict';
/* global describe, it, before, beforeEach */
var expect = require('chai').expect;

var actuator = require('../../src/planning/actuator');
var astar = require('../../src/planning/algorithms/astar');
var blueprint = require('../../src/planning/primitives/blueprint');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var subgraph = require('../../src/database/subgraph');

var tools = require('../testingTools');

describe('actuator', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(actuator)).to.deep.equal(['Action', 'actions']);
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'save']);
  });

  var apple, money, price; // our idea graph is about .. money
  var bs, bs_a, bs_p; // a blueprint with a state with a price
  var a, a_a, a_p, actionImplCount; // an action that requires a price
  before(function() {
    // init some data
    // we have a price (a number with a unit)
    apple = tools.ideas.create();
    money = tools.ideas.create();
    price = tools.ideas.create({ value: number.value(10), unit: money.id });
    apple.link(links.list.thought_description, price);

    // create an action
    // it will add 20 to the price
    a = new actuator.Action();
    a_p = a.requirements.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: money.id }, {transitionable:true});
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
    sg.addVertex(subgraph.matcher.id, money); // this is just to make our tests more valid (see bs_p !== a_p)
    bs_a = sg.addVertex(subgraph.matcher.id, apple);
    bs_p = sg.addVertex(subgraph.matcher.id, price, {transitionable:true});
    sg.addEdge(bs_a, links.list.thought_description, bs_p);
    expect(subgraph.search(sg)).to.deep.equal([sg]);
    expect(sg.concrete).to.equal(true);
    bs = new blueprint.State(sg, [a]);

    // for many of our tests, bs_p !== a_p, otherwise the test doesn't really make sense
    expect(bs_p).to.not.equal(a_p);
  });

  beforeEach(function() {
    actionImplCount = 0;
    price.update({ value: number.value(10), unit: money.id });
    bs.state.deleteData();
    a.requirements.getMatch(a_p).data.value = number.value(0, Infinity);
  });

  it('runCost', function() {
    expect(a.runCost()).to.equal(1);

    var b = new actuator.Action();
    expect(b.runCost()).to.equal(0);
  });

  it('tryTransition', function() {
    expect(actionImplCount).to.equal(0);
    var result = a.tryTransition(bs);

    expect(result.length).to.equal(1);
    // the keys of an object are always strings, the need to be numbers to deep.equal
    expect(Object.keys(result[0])).to.deep.equal([a_p, a_a]);
    expect(result[0][a_p]).to.equal(bs_p);
    expect(actionImplCount).to.equal(0);
  });

  it('runBlueprint', function() {
    expect(actionImplCount).to.equal(0);
    expect(price.data().value).to.deep.equal(number.value(10));
    var expectedData = { type: 'lime_number', value: number.value(30), unit: money.id };
    var result = a.tryTransition(bs);
    expect(result.length).to.equal(1);
    a.runBlueprint(bs, result[0]);

    expect(bs.state.getData(bs_p)).to.deep.equal(expectedData); // vertex data is updated
    expect(price.data()).to.deep.equal(expectedData); // idea data has not
    expect(actionImplCount).to.equal(1); // action has been called
  });
  it.skip('replace_id translation across actuator glue');

  it('cost', function() {
    expect(actionImplCount).to.equal(0);

    var goal = new blueprint.State(bs.state.copy(), [a]);
    goal.state.setData(bs_p, { value: number.value(30), unit: money.id });

    // distance of 20, action costs 1
    expect(a.cost(bs, goal)).to.equal(21);

    // action cannot be applied
    a.requirements.getMatch(a_p).data.value = number.value(0);
    expect(a.cost(bs, goal)).to.equal(Infinity);

    expect(actionImplCount).to.equal(0);
  });
  it.skip('setting the price data to a negative number should not be able to match');

  it('apply', function() {
    expect(actionImplCount).to.equal(0);
    var result = a.tryTransition(bs);
    expect(result.length).to.equal(1);
    var bs2 = a.apply(bs, result[0]);

    expect(bs2).to.not.equal(bs);

    // bs should not be changed
    expect(bs.state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(10), unit: money.id });

    // bs2 should be updated
    expect(bs2.state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });

    // the price data should not be updated (it matches the original vertex data)
    expect(price.data()).to.deep.equal({ value: number.value(10), unit: money.id });

    // this shouldn't call the actionImpl
    expect(actionImplCount).to.equal(0);
  });

  it('save & load', function() {
    // before an action is saved, there is no idea
    expect(a.idea).to.equal(undefined);
    a.save();
    expect(a.idea).to.not.equal(undefined);
    // if we save again, it should use the same idea
    var id = a.idea;
    a.save();
    expect(a.idea).to.equal(id);

    // this is important, we need to serialize the object
    ideas.close(id);

    var loaded = blueprint.load(id);
    expect(loaded).to.be.an.instanceOf(actuator.Action);

    // this is the ultimate test of the load
    expect(loaded).to.deep.equal(a);
    // sans using the actuator in battle
    expect(loaded.tryTransition(bs).length).to.equal(1);
    expect(price.data().value).to.deep.equal(number.value(10));
    loaded.runBlueprint(bs, loaded.tryTransition(bs)[0]);
    expect(actionImplCount).to.equal(1);
    expect(price.data().value).to.deep.equal(number.value(30));

    tools.ideas.clean(id);
  });

  describe('planning', function() {
    it('bug: match new state with inconcrete goal', function() {
      // !goal.concrete
      // apply an action to state
      // check the goal against the new state
      // -----------------------

      var goal = new subgraph.Subgraph();
      var g_a = goal.addVertex(subgraph.matcher.id, apple);
      var g_p = goal.addVertex(subgraph.matcher.number, { value: number.value(30), unit: money.id }, {transitionable:true});
      goal.addEdge(g_a, links.list.thought_description, g_p);
      goal = new blueprint.State(goal, bs.availableActions);

      // we have a goal, it is not concrete
      expect(bs.state.concrete).to.equal(true);
      expect(bs.matches(goal)).to.equal(false);

      var glue = subgraph.match(bs.state, a.requirements, true)[0];
      expect(glue[a_a]).to.equal(bs_a);
      expect(glue[a_p]).to.equal(bs_p);

      // apply the action to get a new state
      var next = a.apply(bs, glue);
      expect(next).to.be.an.instanceOf(blueprint.State);
      expect(next.state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });

      // and now, we should match the goal
      // (this was the bug)
      //
      // matcher.id needs the idea to match idea.id
      // The other matchers use idea because the matcher.id needs it
      // However, they shouldn't be matching on idea.data(); they need to be looking at vertex.data
      //
      // before, I had matcher.number(idea, matchData)
      // now, I have matcher.number(vertex, matchData)
      expect(next.matches(goal)).to.equal(true);
    });

    it('basic, concrete', function() {
      var goal = new blueprint.State(bs.state.copy(), bs.availableActions);
      goal.state.setData(bs_p, { value: number.value(50), unit: money.id });

      expect(bs.state.getData(bs_p)).to.deep.equal({ value: number.value(10), unit: money.id });
      expect(goal.state.getData(bs_p)).to.deep.equal({ value: number.value(50), unit: money.id });
      expect(bs.matches(goal)).to.equal(false);

      var path = astar.search(bs, goal);

      expect(path).to.not.equal(undefined);
      expect(path.states.length).to.equal(3);
      expect(path.states[0].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(10), unit: money.id });
      expect(path.states[1].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
      expect(path.states[2].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(50), unit: money.id });

      expect(path.actions).to.deep.equal([a, a]);
    });

    it('basic, inconcrete', function() {
      var goal = new subgraph.Subgraph();
      var g_a = goal.addVertex(subgraph.matcher.id, apple);
      var g_p = goal.addVertex(subgraph.matcher.number, { value: number.value(50), unit: money.id }, {transitionable:true});
      goal.addEdge(g_a, links.list.thought_description, g_p);
      goal = new blueprint.State(goal, bs.availableActions);

      expect(bs.state.concrete).to.equal(true);
      expect(goal.state.concrete).to.equal(false);
      expect(bs.matches(goal)).to.equal(false);

      var path = astar.search(bs, goal);

      expect(path).to.not.equal(undefined);
      expect(path.states.length).to.equal(3);
      expect(path.states[0].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(10), unit: money.id });
      expect(path.states[1].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
      expect(path.states[2].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(50), unit: money.id });

      expect(path.actions).to.deep.equal([a, a]);
    });

    it('matchRef', function() {
      // I wrote this test because I thought there was a problem finding via matchRef
      // turns out, there wasn't
      // there must be a problem my impl
      //   (use wumpus, go to room via room reference)
      var target_money = tools.ideas.create({ value: number.value(50), unit: money.id });
      bs.state.addVertex(subgraph.matcher.id, target_money);
      expect(bs.state.concrete).to.equal(true);

      var goal = new subgraph.Subgraph();
      var g_a = goal.addVertex(subgraph.matcher.id, apple);
      var g_tm = goal.addVertex(subgraph.matcher.id, target_money);
      var g_p = goal.addVertex(subgraph.matcher.number, g_tm, {transitionable:true,matchRef:true});
      goal.addEdge(g_a, links.list.thought_description, g_p);
      goal = new blueprint.State(goal, bs.availableActions);

      expect(bs.state.concrete).to.equal(true);
      expect(goal.state.concrete).to.equal(false);
      expect(bs.matches(goal)).to.equal(false);

      var path = astar.search(bs, goal);

      expect(path).to.not.equal(undefined);
      expect(path.states.length).to.equal(3);
      expect(path.states[0].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(10), unit: money.id });
      expect(path.states[1].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
      expect(path.states[2].state.getData(bs_p)).to.deep.equal({ type: 'lime_number', value: number.value(50), unit: money.id });

      expect(path.actions).to.deep.equal([a, a]);
    });
  }); // end planning

  // we need to test a blueprint function
  it('blueprint.list', function() {
    // create a node that is the base of blueprints
    // save this in config.data
    // when we do a blueprint.save(), hook it up as a child
    // list plans should load the ones we have saved

    // save our actuator
    a.save();
    expect(a.idea).to.not.equal(undefined);

    // attach it to a dummy context
    var context = ideas.create();
    ideas.load(a.idea).link(links.list.context, context);


    // search for our actuator
    // (basic)
    // if we have data from a use case, so we need to ensure this actuator is included in the list
    var list = blueprint.list();
    expect(list.length).to.be.gt(0);
    expect(list.map(function(i) { return i.id; })).to.include(a.idea);

    // search for our actuator
    // ([])
    // an empty list is still valid; should be the same as providing no context
    list = blueprint.list([]);
    expect(list.length).to.be.gt(0);
    expect(list.map(function(i) { return i.id; })).to.include(a.idea);

    // search for our actuator
    // (ID string)
    list = blueprint.list(context.id);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);

    // search for our actuator
    // (proxy idea)
    list = blueprint.list(context);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);

    // search for our actuator
    // ([ID string])
    list = blueprint.list([context.id]);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);

    // search for our actuator
    // ([proxy idea])
    list = blueprint.list([context]);
    expect(list.length).to.equal(1);
    expect(list[0].id).to.equal(a.idea);

    // search for our actuator
    // returns nothing
    list = blueprint.list('not a valid context');
    expect(list.length).to.equal(0);
  });
}); // end actuator