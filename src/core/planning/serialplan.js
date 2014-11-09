'use strict';
// this builds on a blueprint to represent a set of serial steps
// if a blueprint is a single step, then this is a list of steps
var _ = require('lodash');
var blueprint = require('./primitives/blueprint');

// @param plans: blueprint.Action
//  - the steps that make up this macro action
function SerialAction(plans) {
  blueprint.Action.call(this);

  this.plans = plans;
  this._myRunCost = _.reduce(plans, function(sum, bp) {
    return sum + bp.runCost();
  }, 0);
}
_.extend(SerialAction.prototype, blueprint.Action.prototype);

// blueprint.runCost
SerialAction.prototype.runCost = function() {
  return this._myRunCost;
};

exports.Action = SerialAction;
