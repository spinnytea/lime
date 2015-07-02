'use strict';
// this builds on a blueprint to represent a single action that will affect the world
// this is what we will use to update our internal thought graph
// when we create this class, we still need a callback that will affect the actual world
// - (e.g. the "turn motor" function)
//
// If you want this action to interact with the world,
// you need to statically register a function with actuator.actions
// and then set the a.action to the name of that action
var _ = require('lodash');
var blueprint = require('./primitives/blueprint');
var ideas = require('../database/ideas');
var links = require('../database/links');
var scheduler = require('./scheduler');
var subgraph = require('../database/subgraph');

function ActuatorAction() {
  blueprint.Action.call(this);

  // the name of the action to use
  this.action = null;
}
_.extend(ActuatorAction.prototype, blueprint.Action.prototype);

// blueprint.runCost
// TODO this run cost needs to be influence by the weight of the actions
// - sand != diamond
// - 3 oz of Carbon Fiber vs 2 lbs of Cereal
ActuatorAction.prototype.runCost = function() {
  return this.transitions.reduce(function(sum, t) {
    if(t.hasOwnProperty('cost'))
      return sum + t.cost;
    return sum + 1;
  }, 0);
};

// blueprint.tryTransition
// ActuatorAction only needs the mappings
ActuatorAction.prototype.tryTransition = function(state) {
  // requirements are inner
  // all the requirements must have a representation in the state
  // (the entire state does not need to be contained within the requirements)
  // likewise, when we index by the transition vertex_id, it will be with the requirements
  // (the result of matches is map[inner] = outer)
  //
  // this used to be called with unitOnly=true
  // that's how the legacy system had it, but that was wrong
  // there are better matchers to identify requirements
  // if for some reason the requirements need to be "unit only" then define the matchers to just look for the unit
  // (this wasn't really possible before, but now it is! :D)
  // TL;DR: AC: subgraph.match(state, requirements, false)
  return subgraph.match(state.state, this.requirements);
};

// blueprint.runBlueprint
ActuatorAction.prototype.runBlueprint = function(state, glue) {
  // build a new transition map using the glue
  // I don't want to get into the muddy details of what is in a transition
  // but we need to swap out the vertex_id
  var ts = this.transitions.map(function(t) {
    t = _.clone(t);
    t.vertex_id = glue[t.vertex_id];
    if(t.hasOwnProperty('replace_id'))
      t.replace_id = glue[t.replace_id];
    return t;
  });

  // interact with the world
  if(this.action)
    exports.actions[this.action]();

  // predict the outcome (update what we thing is true)
  // apply the action through to the thought graph
  if(subgraph.rewrite(state.state, ts, true) === undefined)
    throw new Error('rewrite failed');
};

// blueprint.scheduleBlueprint
ActuatorAction.prototype.scheduleBlueprint = function(state, glue) {
  // since the first action runs immediately, there isn't any reason for us to delay
  this.runBlueprint(state, glue);

  // create a goal based on our requirements
  var goal = subgraph.createGoal(state.state, this.requirements, glue);

  // update our goal to reflect the value we expect
  subgraph.rewrite(goal, this.transitions, false);
  // subgraph.match is complicated; our matchers need to demonstrate the value we expect
  this.transitions.forEach(function(t) {
    // TODO test all the different matchers
    // - this should work for !matcher.idea when !options.matchRef, what about the others
    goal._match[t.vertex_id] = _.clone(goal.getMatch(t.vertex_id));
    goal._match[t.vertex_id].data = goal.getData(t.vertex_id);
  });

  // wait for our goal
  return scheduler.defer(state.state, goal);
};

// path.apply
ActuatorAction.prototype.apply = function(state, glue) {
  var ts = this.transitions.map(function(t) {
    t = _.clone(t);
    t.vertex_id = glue[t.vertex_id];
    if(t.hasOwnProperty('replace_id'))
      t.replace_id = glue[t.replace_id];
    return t;
  });

  return new blueprint.State(subgraph.rewrite(state.state, ts, false), state.availableActions);
};

// blueprint.save
ActuatorAction.prototype.save = function() {
  var idea;
  if(this.idea)
    idea = ideas.load(this.idea);
  else {
    idea = ideas.create();
    idea.link(links.list.context, blueprint.context);
    this.idea = idea.id;
  }

  idea.update({
    type: 'blueprint',
    subtype: 'ActuatorAction',
    blueprint: {
      idea: this.idea,
      requirements: subgraph.stringify(this.requirements),
      transitions: this.transitions,
      causeAndEffect: this.causeAndEffect,
      action: this.action
    }
  });

  return this.idea;
};

exports.Action = ActuatorAction;
blueprint.loaders.ActuatorAction = function(blueprint) {
  var a = new ActuatorAction();
  a.idea = blueprint.idea;
  a.requirements = subgraph.parse(blueprint.requirements);
  a.transitions = blueprint.transitions;
  a.causeAndEffect = blueprint.causeAndEffect;
  a.action = blueprint.action;
  return a;
};


// due to serialization of javascript objects...
// all action impls must be registered here
exports.actions = {};