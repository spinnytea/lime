'use strict';
var PriorityQueue = require('priorityqueuejs');

var blueprint = require('../primitives/blueprint');
var config = require('../../../config');
var Path = require('../primitives/path');
var planner = require('../planner');
var stub = require('../stub');
var subgraph = require('../../database/subgraph');

// pull out some of the functions within search so we can unit test it easier
// nothing inside exports.unit should need to be called or substituted
// but I need SOME way of inspecting the search function with a fine toothed comb
var units = exports.units = {};

// create a priority queue to store the current plans
units.frontier = function() {
  return new PriorityQueue(function(a, b) {
    //return (b.cost + b.distFromGoal + b.actions.length) - (a.cost + a.distFromGoal + a.actions.length);
    // XXX I'm still not convinced it's the right move to factor in actions.length
    // - afterall, the path cost is a sum of all steps, so more steps will inherently be have a larger cost
    // TODO add some "emotion config" to astar frontier expansion
    // - if distFromGoal is more important, then we will charge straight for the goal (depth first)
    // - if cost is important, then we will find the "optimal" solution (breadth first), but this takes a while
    var ret = (b.cost + b.distFromGoal*10) - (a.cost + a.distFromGoal*10);
    if(ret !== 0) return ret;

    // if the composite is the same, then the one with the shorter distance wins
    // (the higher cost is permissible)
    // this is evident in how we value the distance from the goal more than the cost in the calc above
    return b.distFromGoal - a.distFromGoal;
  });
};

// apply all of the available actions to the selected path
units.step = function(path, frontier) {
  var nextActions = path.last.actions();

  var immediateStubs = [];
  nextActions = nextActions.filter(function(next) {
    if(next.action instanceof stub.Action && next.action.solveAt === 'immediate') {

      // create a goal state to plan to
      var goal = next.action.apply(path.last, next.glue);
      // only use the section of the graph needed by the requirements
      goal = subgraph.createGoal(goal.state, next.action.requirements, next.glue);
      goal = new blueprint.State(goal, []);

      // construct an  initial state
      // what's important here is that we don't allow THIS stub to follow through
      // TODO should we use !_.equals instead of !==
      var start = new blueprint.State(
        path.last.state,
        path.last.availableActions.filter(function(s) { return s !== next.action; })
      );

      var action = planner.create(start, goal);
      if(action) {
        // populate the list of nextActions from this action instead of the stub
        Array.prototype.push.apply(immediateStubs,
          new blueprint.State(path.last.state, [action]).actions());
      }

      // don't use the stub
      // instead, we'll append the immediateStubs list after the filter
      return false;
    }

    return true;
  });
  Array.prototype.push.apply(nextActions, immediateStubs);

  nextActions.forEach(function(next) {
    var p = path.add(next.action.apply(path.last, next.glue), next.action, next.glue);
    if(p.cost + p.distFromGoal !== Infinity)
      frontier.enq(p);
  });
};

// @param start: a Path.State, initial
// @param goal: a Path.State, final
// @return: a path.Path if we find one, undefined if not
// XXX is exiting early different from being unable to find a solution? should we exit differently?
exports.search = function(start, goal) {
  // the current set of paths
  var frontier = units.frontier();
  frontier.enq(new Path.Path([start], [], [], goal));

  // how many paths have we compared to the goal
  // (used to end early if we don't find anything)
  var numPathsExpanded = 0;

  while(!frontier.isEmpty()) {
//    console.log(frontier._elements.map(function(path) { return path.cost + path.distFromGoal; }));
//    printActions(path, '*');
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


// this is meant for debugging
// it's left here as an example, but shouldn't be used normally
function printActions(path, prefix) { // jshint ignore:line
  console.log((prefix || '') +
    formatNumber(path.cost + path.distFromGoal, 2) + ' ' +
    JSON.stringify(path.actions.map(getName)));
}

function getName(obj) {
  if(obj.constructor.name === 'ActuatorAction')
    return obj.action; // .substr(22);
  if(obj.constructor.name === 'SerialAction')
    return obj.plans.map(getName);
  return obj.constructor.name;
}

// there is no built in format for this
// util.format doesn't do any more than specify the type
// I could get a third party package, but this is stupid simple and only for debugging anyway
function formatNumber(num, length) {
  num = ''+num;
  while(num.length < length)
    num = ' ' + num;
  return num;
}