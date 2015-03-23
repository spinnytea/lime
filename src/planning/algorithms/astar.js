'use strict';
var PriorityQueue = require('priorityqueuejs');
var config = require('../../../config');
var Path = require('../primitives/path');

// pull out some of the functions within search so we can unit test it easier
// nothing inside exports.unit should need to be called or substituted
// but I need SOME way of inspecting the search function with a fine toothed comb
var units = exports.units = {};

// create a priority queue to store the current plans
units.frontier = function() {
  return new PriorityQueue(function(a, b) {
    return (b.cost + b.distFromGoal + b.actions.length) - (a.cost + a.distFromGoal + a.actions.length);
    // XXX I'm still not convinced it's the right move to factor in actions.length
//    return (b.cost + b.distFromGoal) - (a.cost + a.distFromGoal);
  });
};

// apply all of the available actions to the selected path
units.step = function(path, frontier) {
  var nextActions = path.last.actions();
  nextActions.forEach(function(next) {
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
  });
};

// @param start: a Path.State, initial
// @param goal: a Path.State, final
// @return: a path.Path if we find one, undefined if not
// XXX is exiting early different from being unable to find a solution? should we exit differently?
exports.search = function(start, goal) {
  // the current set of paths
  var frontier = units.frontier();
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

    units.step(path, frontier);
  }

  // console.log('Did not find solution (paths expanded: ' + numPathsExpanded + ', frontier: ' + frontier.size() + ').');
  return undefined;
};
