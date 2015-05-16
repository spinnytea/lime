'use strict';
var _ = require('lodash');
var astar = require('./algorithms/astar');
var serialplan = require('./serialplan');

// create a plan
// @param start: blueprint.State
// @param goal: blueprint.State, or an array of States
exports.create = function(start, goal) {
  if(start === undefined || goal === undefined)
    return undefined;

  if(arguments.length > 2) {
    return createMultiple(start, _.values(arguments).slice(1));
  } else if(_.isArray(goal)) {
    if(goal.length === 1)
      return createSingle(start, goal[0]).action;
    return createMultiple(start, goal);
  } else {
    return createSingle(start, goal).action;
  }
};

// @return {
//   action: the Action we have found
//   state: the last State of the path (if we need to chain
// }
function createSingle(start, goal) {
  var path = astar.search(start, goal);

  if(path === undefined)
    return { action: undefined, state: undefined };

  if(path.actions.length === 0) {
    // do a little finagling
    // this plan shouldn't be broken
    // but that doesn't mean it needs to be useful
    //
    // XXX this impacts tryTransition and runBlueprint; need to allow this as a noop
    var sp = new serialplan.Action([]);
    sp.requirements = start.state;
    return { action: sp, state: start };
  }

  if(path.actions.length === 1)
    return { action: path.actions[0], state: path.last };

  return { action: new serialplan.Action(path.actions), state: path.last };
}

function createMultiple(start, goals) {
  // if every plan succeeds, then return a new serial action
  // if one of the plans fails, then the whole thing fails
  var actions = [];
  if(goals.every(function(g) {
      var as = createSingle(start, g);
      if(as.action === undefined)
        return false;
      actions.push(as.action);
      start = as.state;
      return true;
    }))
    return new serialplan.Action(actions);
  return undefined;
}
