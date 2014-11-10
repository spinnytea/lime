'use strict';
// this builds on a blueprint to represent a set of serial steps
// if a blueprint is a single step, then this is a list of steps
//
// you shouldn't need to use "new serialplan.Action" (SerialAction)
// instead, you can use "serialplan.create"
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

// blueprint.tryTransition
// SerialAction needs a list of mappings
SerialAction.prototype.tryTransition = function(state) {
  var that = this;

  // because each action needs it's own mappings
  // and each action could come after any mapping
  // we need to build a list of every valid mapping tree
  if(that.plans.length === 0)
    return [];

  // { glues: [], state: state }
  // we are interested in the list of glues
  // we need the latest state so we can resolve the next glue
  var currList = [];

  that.plans[0].tryTransition(state).forEach(function(glue) {
    currList.push({ glues: [glue], state: that.plans[0].apply(state, glue) });
  });

  // use the currList to process this step
  // accumulate the results
  // at the end, we'll swap tha lists
  var nextList;
  for(var i = 1; i < that.plans.length; i++) {
    nextList = [];

  // I like the [].forEach notation much better
//    currList.forEach(function(curr) {
//      that.plans[i].tryTransition(curr.state).forEach(function(glue) {
//        ...
//      });
//    });
  // but jshint doesn't like when we create functions in a loop (loopfunc)
  // so instead, we fall back to for(;;)

    for(var c = 0; c < currList.length; c++) {
      var curr = currList[c];

      var transitions = that.plans[i].tryTransition(curr.state);
      for(var t = 0; t < transitions.length; t++) {
        var glue = transitions[t];

        var glues = [];
        Array.prototype.push.apply(glues, curr.glues);
        glues.push(glue);

        // no need to apply the action on the last step
        // reuse the state argument
        state = undefined;
        if(i < that.plans.length - 1)
          state = that.plans[i].apply(curr.state, glue);

        nextList.push({ glues: glues, state: state });
      }
    }

    // swap curr and next
    currList = nextList;
  }

  // now just pull out the glue lists
  return currList.map(function(curr) { return curr.glues; });
};

// blueprint.runBlueprint
SerialAction.prototype.runBlueprint = function(state, glue) {
  this.plans.forEach(function(plan, idx) {
    plan.runBlueprint(state, glue[idx]);
  });
};

// path.apply
SerialAction.prototype.apply = function(state, glue) {
  return _.reduce(this.plans, function(result, plan, idx) {
    return plan.apply(result, glue[idx]);
  }, state);
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