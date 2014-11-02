'use strict';
// this builds on a blueprint to represent a single action that will affect the world
// this is what we will use to update our internal thought graph
// when we create this class, we still need a callback that will affect the actual world
// - (e.g. the "turn motor" function)
var _ = require('lodash');
var blueprint = require('./primitives/blueprint');

// @param transitions: subgraph.rewrite.transitions
function ActuatorAction(transitions) {
  blueprint.Action.call(this);

  this.transitions = transitions;
}
_.extend(ActuatorAction.prototype, blueprint.Action.prototype);

ActuatorAction.prototype.runCost = function() {
  return this.transitions.length;
};

exports.Action = ActuatorAction;
