'use strict';
var PriorityQueue = require('priorityqueuejs');
var config = require('../../../../config');
var Path = require('../primitives/path');

// @param start: a Path.State, initial
// @param goal: a Path.State, final
// @return: a path.Path if we find one, undefined if not
// XXX is exiting early different from being unable to find a solution? should we exit differently?
exports.search = function(start, goal) {
  // the current set of paths
  var frontier = new PriorityQueue(function(a, b) {
    return (b.cost + b.distFromGoal) - (a.cost + a.distFromGoal);
  });
  frontier.enq(new Path.Path([start], [], goal));

  // how many paths have we compared to the goal
  // (used to end early if we don't find anything)
  var numPathsExpanded = 0;

  while(!frontier.isEmpty()) {
    var path = frontier.deq();

    // do we win?
    if(path.last.matches(goal))
      // console.log('Found solution (paths expanded: ' + numPathsExpanded + ', frontier: ' + frontier.size() + ').');
      return path;

    // exit early?
    numPathsExpanded++;
    if(numPathsExpanded > config.data.astar_max_paths)
      return undefined;

    var nextActions = path.last.actions();
    for(var i=0; i<nextActions.length; i++) {
      var next = nextActions[i];
      if(next.action && next.glue) {
        frontier.enq(path.add(next.action.apply(path.last, next.glue), next.action));
      } else {
        frontier.enq(path.add(next.apply(path.last), next));
      }
    }
  }

  return undefined;
};
