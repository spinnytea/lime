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
var scheduler = require('./scheduler');
var subgraph = require('../database/subgraph');

function ActuatorAction() {
  blueprint.Action.call(this);

  // the name of the action to use
  // TODO rename to 'rawFn'
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
  var ts = subgraph.units.convertInnerTransitions(this.transitions, glue);

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
  // create a goal based on our requirements
  var goal = subgraph.createGoal(state.state, this.requirements, glue);
  // update our goal to reflect the value we expect
  goal = subgraph.rewrite(goal, this.transitions, false);

  // since the first action runs immediately, there isn't any reason for us to delay
  this.runBlueprint(state, glue);

  // wait for our goal
  return scheduler.defer(state.state, goal);
};

// path.apply
ActuatorAction.prototype.apply = function(state, glue) {
  var ts = subgraph.units.convertInnerTransitions(this.transitions, glue);

  return new blueprint.State(subgraph.rewrite(state.state, ts, false), state.availableActions);
};

// blueprint.prepSave
ActuatorAction.prototype.prepSave = function() {
  return {
    idea: this.idea,
    requirements: subgraph.stringify(this.requirements),
    transitions: this.transitions,
    causeAndEffect: this.causeAndEffect,
    action: this.action
  };
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