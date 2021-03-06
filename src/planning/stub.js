'use strict';
// this builds on a blueprint to represent a possible plan in the world
// its sort of like a higher level plan or a planning shortcut
// it says that this kind of thing CAN be done, but we need to go back later and figure out this section
var _ = require('lodash');
var actuator = require('./actuator');
var blueprint = require('./primitives/blueprint');
var subgraph = require('../database/subgraph');

function StubAction(solveAt) {
  blueprint.Action.call(this);

  if(exports.solveAt.indexOf(solveAt) === -1)
    // this is because the stubs aren't used directly
    // each well known solveAt has an implementation somewhere in the source
    throw new Error('solveAt must be defined and well known');

  this.solveAt = solveAt;
}
_.extend(StubAction.prototype, blueprint.Action.prototype);

// let's take the impl from actuator since it has everything we need
StubAction.prototype.runCost = actuator.Action.prototype.runCost;
StubAction.prototype.tryTransition = actuator.Action.prototype.tryTransition;
StubAction.prototype.apply = actuator.Action.prototype.apply;

// blueprint.prepSave
StubAction.prototype.prepSave = function() {
  return {
    idea: this.idea,
    requirements: subgraph.stringify(this.requirements),
    transitions: this.transitions,
    causeAndEffect: this.causeAndEffect,
    solveAt: this.solveAt
  };
};

exports.Action = StubAction;
blueprint.loaders.StubAction = function(blueprint) {
  var a = new StubAction(blueprint.solveAt);
  a.idea = blueprint.idea;
  a.requirements = subgraph.parse(blueprint.requirements);
  a.transitions = blueprint.transitions;
  a.causeAndEffect = blueprint.causeAndEffect;
  return a;
};

exports.solveAt = [
  // this occurs during astar.units.step
  // it's sort of like a greedy depth-first search
  'immediate',

  // this occurs during planner.create, after the whole plan has been constructed
  // it's sort of like a greedy breadth-first search
  'create'
];

// @param start: the BlueprintState we are starting from
// @param action: the stub action we are trying to fulfill
// @param glue: how the action is related to the start
// @param goal: the BlueprintState we are trying to get to (the complete state)
exports.createStates = function(start, action, glue, goal) {
  // find the actions that we can use for this plan
  // if the stub designates what can be used, then use those
  // if it doesn't, then use the same pool of actions without this stub (no recursion)
  var subActions = [];
  if(action.idea)
    subActions = blueprint.list(action.idea);
  if(subActions.length > 0) {
    subActions = subActions.map(blueprint.load);
  } else {
    subActions = start.availableActions.filter(function(s) { return s !== action; });
  }

  return {
    start: new blueprint.State(
      start.state,
      subActions
    ),
    goal: new blueprint.State(
      subgraph.createGoal(goal.state, action.requirements, glue),
      []
    )
  };
};
