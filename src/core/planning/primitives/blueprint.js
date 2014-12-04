'use strict';
// this class defines an Action and State that can be used by a Path
var _ = require('lodash');
var ideas = require('../../database/ideas');
var links = require('../../database/links');
var subgraph = require('../../database/subgraph');
var number = require('./number');
var discrete = require('./discrete');

// when we try to calculate or estimate a distance,
// if there is an error,
// then we will add/return this number
var DISTANCE_ERROR = Infinity;
var DISTANCE_DEFAULT = 1;

// The Action prototype is meant to be overridden
// In java terms, this in an "abstract class"
// Inheriting prototypes should:
//   function SerialPlan() { blueprint.BlueprintAction.call(this); }
//   _.extend(SerialPlan.prototype, blueprint.BlueprintAction.prototype);
// TODO rename the the functions - runCost, tryTransition, runBlueprint
function BlueprintAction() {
  // the requirements tell us what is needed to match a state
  // they say "we can take action in this situtation"
  // if the state matches the requirements, the action can be performed
  // (these statements are intentionally redundant)
  this.requirements = new subgraph.Subgraph();
}

// how much effort does it take to run this plan?
// TODO This hasn't been fully defined yet.
// - this could be a cache of the number of total steps
// - this could be based on changes in value
// - this may need to have multipliers based on real-world value of things
// - maybe we can come up with our own scarcity metric?
//   - this is probably only a good idea if it's based on other provided info
//   - like cost, quantity, effort to obtain, etc
BlueprintAction.prototype.runCost = function() {
  throw new Error(this.constructor.name + ' does not implement runCost');
};

// when planning, we need to check to see if we can make a transition
// this does not actually take action (this does not apply action to the real world)
// this performs a thought experiment with the actions, it updates an isolated graph, but not change data in the world
//
// how this works:
// - call subgraph.match and collect the possible transitions
// - for more complicated actions, this may branch or iterate, or whatever
//
// why this is important
// - requirements tells us what is needed in a state
// - this tryTransitions basically says "and this is how the state maps to the requirements"
//
// this should always return an array; an array of what should be handled by the extending prototype
// (e.g. actuator.runBlueprint will consume results from actuator.tryTransition)
//
// @param state: a BlueprintState
// @return an array of glue objects (an array of inputs meant for runBlueprint)
BlueprintAction.prototype.tryTransition = function(state) {
  // I can't get jshint it ignore the unused param
  // but I want the param as documentation
  void(state);

  throw new Error(this.constructor.name + ' does not implement tryTransition');
};

// run the Blueprint
// this isn't planning; actually follow the plan
// (this is not a drill)
//
// @param glue: a result of tryTransition
// @param state: a BlueprintState (will be modified)
BlueprintAction.prototype.runBlueprint = function(state, glue) {
  // I can't get jshint it ignore the unused param
  // but I want the param as documentation
  void(state);
  void(glue);

  throw new Error(this.constructor.name + ' does not implement runBlueprint');
};

// path.Actions.cost
BlueprintAction.prototype.cost = function(from, to) {
  if(subgraph.match(from.state, this.requirements).length === 0)
    return Infinity;
  return from.distance(to) + this.runCost();
};

// path.Action.apply
// run the action internally (thought experiment), but don't actually interact with the world
BlueprintAction.prototype.apply = function() {
  throw new Error(this.constructor.name + ' does not implement apply');
};

// save the Action so it can be loaded using one of the blueprint.loaders
// (e.g. ActuatorAction will need to implement save, and supply a loader)
// Note: the data must conform to blueprint.load
// @return the id that the plan is saved to (probably also recorded under bp.idea)
BlueprintAction.prototype.save = function() {
  throw new Error(this.constructor.name + ' does not implement save');
};

// saving and loading blueprints
// register constructors by name so we can load saved blueprints
exports.loaders = {};
exports.load = function(id) {
  var data = ideas.load(id).data();
  if(!(data.type === 'blueprint' && typeof data.subtype === 'string' && typeof data.blueprint === 'object'))
    return undefined;
  return exports.loaders[data.subtype](data.blueprint);
};

exports.Action = BlueprintAction;


// The State should be used by all blueprints
// (e.g. actuator and serial plan shouldn't need their own implementation)
//
// @param state: subgraph
//  - this state is a theoretical situation
//  - it may be based on reality (idea.idata())
//  - it may transition into an alternate reality (vertex.data)
// @param availableActions: an array of blueprint.Actions
//  - these should be actions that make sense to take in this context
function BlueprintState(subgraph, availableActions) {
  if(!subgraph.concrete)
    throw new RangeError('blueprint states must be concrete');
  this.state = subgraph;
  this.availableActions = availableActions;
}

// path.State.distance
BlueprintState.prototype.distance = function(to) {
  var that = this;
  var result = subgraph.match(that.state, to.state, true);
  if(result.length === 0)
    return DISTANCE_ERROR;

  var min = DISTANCE_ERROR;
  result.forEach(function(vertexMap) {
    var cost = 0;
    _.forEach(vertexMap, function(outer, inner) {
      var o = that.state.vertices[outer];
      var i = to.state.vertices[inner];

      if(o.transitionable !== i.transitionable) {
        cost += DISTANCE_ERROR;
        // no need to check other vertices in this map
        return false;
      } else if(o.transitionable) {
        // check the values

        var diff;
        if(number.isNumber(o.data)) {
          diff = number.difference(o.data, i.data);
          if(diff === undefined) {
            cost += DISTANCE_ERROR;
            // no need to check other vertices in this map
            return false;
          }
          cost += diff;
        } else if(number.isNumber(i.data)) {
            // one is a number and the other is not
            cost += DISTANCE_ERROR;
            // no need to check other vertices in this map
            return false;
        } else if(discrete.isDiscrete(o.data)) {
          diff = discrete.difference(o.data, i.data);
          if(diff === undefined) {
            cost += DISTANCE_ERROR;
            // no need to check other vertices in this map
            return false;
          }
          cost += diff;
        } else if(discrete.isDiscrete(i.data)) {
            // one is a discrete and the other is not
            cost += DISTANCE_ERROR;
            // no need to check other vertices in this map
            return false;
        } else {
          if(!_.isEqual(o.data, i.data))
            cost += DISTANCE_DEFAULT;
        }
      }
    });
    if(cost < min)
      min = cost;
  });
  return min;
};

// path.State.actions
BlueprintState.prototype.actions = function() {
  var that = this;
  var ret = [];
  // the actions need relate to this state
  // XXX should I just explode the possible actions to begin with?
  // - or cache the results from the first run?
  this.availableActions.forEach(function(action) {
    action.tryTransition(that).forEach(function(glue) {
      ret.push({ action: action, glue: glue });
    });
  });
  return ret;
};

// path.State.matches
// AC: subgraph.match(unitOnly: false)
BlueprintState.prototype.matches = function(blueprintstate) {
  return subgraph.match(this.state, blueprintstate.state, false).length > 0;
};

exports.State = BlueprintState;


exports.context = ideas.context('blueprint');
exports.list = function(contexts) {
  // build our search
  var sg = new subgraph.Subgraph();
  // this is the node in the graph that we care about
  var result = sg.addVertex(subgraph.matcher.filler);
  // we have our base context
  sg.addEdge(result, links.list.context, sg.addVertex(subgraph.matcher.id, exports.context));
  if(contexts) {
    // a single context presented as an ID string
    // a single proxy idea
    if(typeof contexts === 'string' || contexts.id)
      sg.addEdge(result, links.list.context, sg.addVertex(subgraph.matcher.id, contexts), 1);
    // an array of contexts
    else if(contexts.length)
      contexts.forEach(function(c) {
        sg.addEdge(result, links.list.context, sg.addVertex(subgraph.matcher.id, c), 1);
      });
  }

  // search for matches
  var matches = subgraph.search(sg);
  if(matches.length === 0)
    return undefined;

  // we have a set of subgraphs that match
  // we only care about the ideas that match
  return matches.map(function(m) {
    return m.vertices[result].idea;
  });
};