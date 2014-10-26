'use strict';
// this class defines an Action and State that can be used by a Path
//
// In java terms, this in an "abstract class"
// Other classes should:
//   function SerialPlan() { blueprint.BlueprintAction.call(this); }
//   _.extend(SerialPlan.prototype, blueprint.BlueprintAction.prototype);
var subgraph = require('../../database/subgraph');

function BlueprintAction() {
  this.requirements = new subgraph.Subgraph();
}

// how much effort does it take to run this plan?
// TODO This hasn't been fully defined yet.
// - this could be a cache of the number of total steps
// - this could be based on changes in value
// - this may need to have multipliers based on real-world value of things
// - maybe we can come up with our own scarcity metric?
//   - this is probably only a good idea if it's based on other provided info
//   - like cost, quantity, effort to obtain, etc
BlueprintAction.prototype.runCost = function() {
  throw new Error(this.constructor.name + ' does not implement runCost');
};

// when planning, we need to check to see if we can make a transition
// this does not actually take action (this does not apply action to the real world)
// this performs a thought experiment with the actions, it updates an isolated graph, but not change data in the world
// (Pro Tip: this will probably be some value stored in a temporary subgraph)
BlueprintAction.prototype.tryTransition = function() {
  throw new Error(this.constructor.name + ' does not implement tryTransition');
};

// run the Blueprint
// this isn't planning; actually follow the plan
// (this is not a drill)
BlueprintAction.prototype.runBlueprint = function() {
  throw new Error(this.constructor.name + ' does not implement runBlueprint');
};

exports.BlueprintAction = BlueprintAction;


// @param state: subgraph
function BlueprintState(subgraph) {
  this.subgraph = subgraph;
}

BlueprintState.prototype.matches = function(blueprintstate) {
  return subgraph.match(this.subgraph, blueprintstate.subgraph).length > 0;
};

exports.BlueprintState = BlueprintState;
