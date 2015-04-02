'use strict';
var _ = require('lodash');

// @param states: an array of State
// @param actions: an array of Action
// @param goal: the target State
// XXX error checking? actions must be 1 shorter than states
// XXX error checking? state/action implementation
var Path = exports.Path = function(states, actions, goal) {
  this.states = states;
  this.actions = actions;
  this.goal = goal;
  this.cost = _.reduce(actions, function(sum, action, idx) {
    return sum + action.cost(states[idx], states[idx+1]);
  }, 0);

  this.last = _.last(states);
  this.distFromGoal = this.last.distance(goal);
};

// adds another state and action to the existing path
// @param state: a State
// @param action: a Action
// @return a new Path
// XXX error checking? should we verify that apply the action to this.last will generate state?
Path.prototype.add = function(state, action) {
  var states = [];
  var actions = [];
  states.push.apply(states, this.states);
  states.push(state);
  actions.push.apply(actions, this.actions);
  actions.push(action);

  return new Path(states, actions, this.goal);
};

// These are like abstract classes in Javas
// They are a description of what needs to be implemented for Path to work
// They shouldn't actually be created, this is just an example/documentation for implementing them
// See: /spec/core/planning/NumberSlide.js for a practical example

var Action = exports.Action = function() {};
var State = exports.State = function() {};

// how much does it cost to go from State from to the State to
// this isn't just the distance, this is the effort of the action
// (e.g. gain an apple from store A vs store B)
// @param from: a State
// @param to: a State
// @return number; greater than zero
Action.prototype.cost = function(from, to) {
  void(from);
  void(to);
  return 1;
};

// apply the action in a theoretical sense
// this will create a new state, but not actually interact with the world.
// @param from: a State to apply this Action to
// @return a new State
// TODO rename this function
Action.prototype.apply = function(from) {
  void(from);
  return new State();
};


// estimate the distance to the next state
// since this is used as an A* heuristic, it's best to undershoot (get close, but air on the side of caution)
// @param to: a State
// @return number; greater than zero
State.prototype.distance = function(to) {
  void(to);
  return 1;
};

// @return an array of all the possible actions from this state
//
// alt: return an array of { action: a, glue: g }
// - used by blueprint.State.actions, blueprint.Action.apply
State.prototype.actions = function() {
  return [];
};

// @param state: a State
// @return boolean
State.prototype.matches = function(state) {
  void(state);
  return false;
};