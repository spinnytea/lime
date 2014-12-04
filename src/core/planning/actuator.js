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
var subgraph = require('../database/subgraph');

function ActuatorAction() {
  blueprint.Action.call(this);

  // subgraph.rewrite.transitions
  // how does this actuator affect the world
  this.transitions = [];

  // the name of the action to use
  this.action = null;
}
_.extend(ActuatorAction.prototype, blueprint.Action.prototype);

// blueprint.runCost
// TODO this run cost needs to be influence by the weight of the actions
// - sand != diamond
// - 3 oz of Carbon Fiber vs 2 lbs of Cereal
ActuatorAction.prototype.runCost = function() {
  return this.transitions.length;
};

// blueprint.tryTransition
// ActuatorAction only needs the mappings
ActuatorAction.prototype.tryTransition = function(state) {
  // requirements are inner
  // all the requirements must have a representation in the state
  // (the entire state does not need to be contained within the requirements)
  // likewise, when we index by the transition vertex_id, it will be with the requirements
  // (the result of matches is map[inner] = outer)
  return subgraph.match(state.state, this.requirements, true);
};

// blueprint.runBlueprint
ActuatorAction.prototype.runBlueprint = function(state, glue) {
  // build a new transition map using the glue
  // I don't want to get into the muddy details of what is in a transition
  // but we need to swap out the vertex_id
  var ts = this.transitions.map(function(t) {
    t = _.clone(t);
    t.vertex_id = glue[t.vertex_id];
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

// path.apply
ActuatorAction.prototype.apply = function(state, glue) {
  var ts = this.transitions.map(function(t) {
    t = _.clone(t);
    t.vertex_id = glue[t.vertex_id];
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
  a.action = blueprint.action;
  return a;
};


// due to serialization of javascript objects...
// all action impls must be registered here
exports.actions = {};