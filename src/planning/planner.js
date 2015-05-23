'use strict';
var _ = require('lodash');
var astar = require('./algorithms/astar');
var blueprint = require('./primitives/blueprint');
var serialplan = require('./serialplan');
var stub = require('./stub');
var subgraph = require('../database/subgraph');

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

  // TODO this doesn't make sense as actions.map; it updates state, too
  // TODO this only works when either ALL actions are stubs, or NO actions are stubs
  // - e.g. lm-wumpus: stub -> right -> stub ~ this doesn't make sense, because we don't know our direction after each stub
  path.actions = path.actions.map(function(a, idx) {
    if(a instanceof stub.Action && a.solveAt === 'create') {
      // re-plan this step, without the current stub
      var curr_start = new blueprint.State(
        path.states[idx].state,
        start.availableActions.filter(function(s) { return s !== a; })
      );
      // available actions don't matter for a goal
      var goal_state = subgraph.createGoal(path.states[idx+1].state, path.actions[idx].requirements, path.glues[idx]);
      var curr_goal = new blueprint.State(goal_state, []);

      var result = createSingle(curr_start, curr_goal);
      if(result.action === undefined)
        return result.action;
      path.states[idx+1].state = result.state.state;
      return result.action;
    }
    return a;
  });
  // after we've solved for stubs, we need to make sure that all of the actions check out
  // if one of them doesn't work, then the whole plan doesn't work
  if(path.actions.some(function(a) { return a === undefined; }))
    return { action: undefined, state: undefined };

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
