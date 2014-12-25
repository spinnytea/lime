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
    return (b.cost + b.distFromGoal + b.actions.length) - (a.cost + a.distFromGoal + a.actions.length);
    // XXX I'm still not convinced it's the right move to factor in actions.length
//    return (b.cost + b.distFromGoal) - (a.cost + a.distFromGoal);
  });
  frontier.enq(new Path.Path([start], [], goal));

  // how many paths have we compared to the goal
  // (used to end early if we don't find anything)
  var numPathsExpanded = 0;

  while(!frontier.isEmpty()) {
    // js hint loopfunc: true
//    console.log(frontier._elements.map(function(path) { return path.cost + path.distFromGoal; }));
    var path = frontier.deq();

    // do we win?
    // TODO is distFromGoal === 0 enough?
    // - are they the same thing?
    if(path.last.matches(goal))
      // console.log('Found solution (paths expanded: ' + numPathsExpanded + ', frontier: ' + frontier.size() + ').');
      return path;

    // exit early?
    numPathsExpanded++;
    if(numPathsExpanded > config.settings.astar_max_paths)
      // console.log('Did not find solution (paths expanded: ' + numPathsExpanded + ', frontier: ' + frontier.size() + ').');
      return undefined;


    // this is a for() loop because jshint doesn't like it if I use [].forEach()
    // it doesn't want me to create the callback function within the while statement
    // and any function I pass to forEach can't take the extra arguments need to pass the scope data (path, frontier)
    // I can get around this by setting the execution scope of the function when I call it, but that's just confusing
    // (and jshint thinks it might be a strict violation)
    // so.. I have to use a for() loop
    //
    // apply all of the available actions to the selected path
    var nextActions = path.last.actions();
    for(var i=0; i<nextActions.length; i++) {
      var next = nextActions[i];
      if(next.action && next.glue) {
        // path for blueprints
        // TODO remove action/glue from the return
        // - incorporate glue into the action (this means making a copy of the actions)
        var p = path.add(next.action.apply(path.last, next.glue), next.action);
        if(p.cost + p.distFromGoal !== Infinity)
          frontier.enq(p);
      } else {
        // vanilla path
        frontier.enq(path.add(next.apply(path.last), next));
      }
    }
  }

  // console.log('Did not find solution (paths expanded: ' + numPathsExpanded + ', frontier: ' + frontier.size() + ').');
  return undefined;
};
