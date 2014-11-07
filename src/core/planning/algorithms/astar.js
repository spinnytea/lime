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


    // this is a for() loop because jshint doesn't like it if I use [].forEach()
    // it doesn't want me to create the callback function within the while statement
    // and any function I pass to forEach can't take the extra arguments need to pass the scope data (path, frontier)
    // I can get around this by setting the execution scope of the function when I call it, but that's just confusing
    // (and jshint thinks it might be a strict violation)
    // so.. I have to use a for() loop
    var nextActions = path.last.actions();
    for(var i=0; i<nextActions.length; i++) {
      var next = nextActions[i];
      if(next.action && next.glue) {
        // TODO remove action/glue from the return
        // - incorporate glue into the action (this means making a copy of the actions)
        frontier.enq(path.add(next.action.apply(path.last, next.glue), next.action));
      } else {
        frontier.enq(path.add(next.apply(path.last), next));
      }
    }
  }

  return undefined;
};
