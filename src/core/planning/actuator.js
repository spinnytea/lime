'use strict';
// this builds on a blueprint to represent a single action that will affect the world
// this is what we will use to update our internal thought graph
// when we create this class, we still need a callback that will affect the actual world
// - (e.g. the "turn motor" function)
var _ = require('lodash');
var blueprint = require('./primitives/blueprint');
var subgraph = require('../database/subgraph');

function ActuatorAction() {
  blueprint.Action.call(this);

  // subgraph.rewrite.transitions
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
  return subgraph.match(state.state, this.requirements);
};

// blueprint.runBlueprint
ActuatorAction.prototype.runBlueprint = function() {
};

exports.Action = ActuatorAction;
