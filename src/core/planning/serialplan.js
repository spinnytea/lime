'use strict';
// this builds on a blueprint to represent a set of serial steps
// if a blueprint is a single step, then this is a list of steps
var _ = require('lodash');
var astar = require('./algorithms/astar');
var blueprint = require('./primitives/blueprint');

// @param plans: blueprint.Action
//  - the steps that make up this macro action
function SerialAction(plans, requirements) {
  blueprint.Action.call(this);

  this.plans = plans;
  this.requirements = requirements;

  // add the cost of all the plans
  // if there is no cost (~no plans), then add a deterrent cost
  this._myRunCost = _.reduce(plans, function(sum, bp) {
    return sum + bp.runCost();
  }, 0) || 1;
}
_.extend(SerialAction.prototype, blueprint.Action.prototype);

// blueprint.runCost
SerialAction.prototype.runCost = function() {
  return this._myRunCost;
};

exports.Action = SerialAction;

// create a serial plan
// @param start: blueprint.State
// @param goal: blueprint.State
exports.create = function(start, goal) {
  var path = astar.search(start, goal);

  if(path === undefined)
    return undefined;

  if(path.actions.length === 1)
    return path.actions[0];

  return new SerialAction(path.actions, start.state);
};