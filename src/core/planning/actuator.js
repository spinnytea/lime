'use strict';
// this builds on a blueprint to represent a single action that will affect the world
// this is what we will use to update our internal thought graph
// when we create this class, we still need a callback that will affect the actual world
// - (e.g. the "turn motor" function)
//
// If you want this action to interact with the world, replace the actionImpl function
var _ = require('lodash');
var blueprint = require('./primitives/blueprint');
var subgraph = require('../database/subgraph');

function ActuatorAction() {
  blueprint.Action.call(this);

  // subgraph.rewrite.transitions
  // how does this actuator affect the world
  this.transitions = [];
}
_.extend(ActuatorAction.prototype, blueprint.Action.prototype);

// blueprint.runCost
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
  this.actionImpl();

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

// no op function
// this should replaced by anything that wants to actually do work
ActuatorAction.prototype.actionImpl = function() {};

exports.Action = ActuatorAction;
blueprint.loaders.ActuatorAction = ActuatorAction;
