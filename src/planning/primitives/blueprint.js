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

  // is this a cause-and-effect action?
  // does this happen automatically within the world?
  this.causeAndEffect = false;
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
// @return an array of glue objects (an array of inputs meant for runBlueprint, scheduleBlueprint)
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
// this will run the whole blueprint at once start to finish without stopping
// (synchronously run the blueprint)
//
// @param state: a BlueprintState (will be modified)
// @param glue: a result of tryTransition
BlueprintAction.prototype.runBlueprint = function(state, glue) {
  // I can't get jshint it ignore the unused param
  // but I want the param as documentation
  void(state);
  void(glue);

  throw new Error(this.constructor.name + ' does not implement runBlueprint');
};

// run the Blueprint
// this isn't planning; actually follow the plan
// (this is not a drill)
//
// this will use the scheduler to run the blueprint
// (asynchronously run the blueprint)
// the first action will run immediately; subsequent actions will run when it's time
//
// @param state: a BlueprintState (will be modified)
// @param glue: a result of tryTransition
// @return a promise that will be rejected if the plan ultimately fails, or will be resolved when the goal has been met
BlueprintAction.prototype.scheduleBlueprint = function(state, glue) {
  // I can't get jshint it ignore the unused param
  // but I want the param as documentation
  void(state);
  void(glue);

  throw new Error(this.constructor.name + ' does not implement scheduleBlueprint');
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
  if(!(data.type === 'blueprint' && data.blueprint && typeof data.subtype === 'string'))
    return undefined;
  return exports.loaders[data.subtype](data.blueprint);
};

exports.Action = BlueprintAction;


// The State should be used by all blueprints
// (e.g. actuator and serial plan shouldn't need their own implementation)
//
// @param state: subgraph
//  - this state is a theoretical situation
//  - it may be based on reality (idea.data())
//  - it may transition into an alternate reality (vertex.data)
// @param availableActions: an array of blueprint.Actions
//  - these should be actions that make sense to take in this context
function BlueprintState(subgraph, availableActions) {
  this.state = subgraph;
  this.availableActions = availableActions;
}

// path.State.distance
// TODO accept vertexMap as an argument
BlueprintState.prototype.distance = function(to) {
  if(!this.state.concrete)
    // TODO do I throw an error or silently fail? (return DISTANCE_ERROR)
    throw new Error('blueprint states must be concrete to plan from');
  var that = this;
  var result = subgraph.match(that.state, to.state, true);
  if(result.length === 0)
    return DISTANCE_ERROR;

  var min = DISTANCE_ERROR;
  result.forEach(function(vertexMap) {
    var cost = 0;
    _.forEach(vertexMap, function(outer, inner) {
      var oMatch = that.state.getMatch(outer);
      var iMatch = to.state.getMatch(inner);

      // if the inner is transitionable,
      // but the outer is not,
      // then this is bad
      if(iMatch.options.transitionable && !oMatch.options.transitionable) {
        cost += DISTANCE_ERROR;
        return false;
      }

      var o_data = that.state.getData(outer);
      var i_data = to.state.getData(inner);
      if(i_data === undefined) {
        // if the data is not cached, then find it from the match ref
        if(iMatch.options.matchRef)
          i_data = that.state.getData(vertexMap[iMatch.data]);

        // used when looking for a goal
        // TODO review this case; is this correct?
        // - are there others? (basically, how else is the data used by subgraphs)
        // - specifically, review blueprints
        else if(!to.state.getIdea(inner) && !to.concrete)
          i_data = iMatch.data;
      }

      // check the values
      // TODO should all these ifs be based on matcher, rather than datatype?
      var diff = 0;
      if (iMatch.matcher === subgraph.matcher.similar) {
        // if we are doing a similar match, then we don't have the data to compare against
        // the outer element is by necessity the value we are looking for
        // the distance is simply 0 (for this node)
        diff = 0;
      } else if(number.isNumber(o_data)) {
        diff = number.difference(o_data, i_data);
        if(diff === undefined) {
          cost += DISTANCE_ERROR;
          // no need to check other vertices in this map
          return false;
        }
      } else if(number.isNumber(i_data)) {
          // one is a number and the other is not
          cost += DISTANCE_ERROR;
          // no need to check other vertices in this map
          return false;
      } else if(discrete.isDiscrete(o_data)) {
        diff = discrete.difference(o_data, i_data);
        if(diff === undefined) {
          cost += DISTANCE_ERROR;
          // no need to check other vertices in this map
          return false;
        }
      } else if(discrete.isDiscrete(i_data)) {
          // one is a discrete and the other is not
          cost += DISTANCE_ERROR;
          // no need to check other vertices in this map
          return false;
      } else {
        if(!_.isEqual(o_data, i_data))
          diff = DISTANCE_DEFAULT;
      }

      if(!oMatch.options.transitionable && diff > 0) {
        // we can't change the outer value
        // but the outer value doesn't match
        cost += DISTANCE_ERROR;
        return false;
      }

      // otherwise, add the diff
      cost += diff;
    });
    if(cost < min)
      min = cost;
  });
  return min;
};

// path.State.actions
BlueprintState.prototype.actions = function() {
  if(!this.state.concrete)
    // TODO do I throw an error or silently fail? (return [])
    throw new Error('blueprint states must be concrete to plan from');
  var that = this;
  var awi = []; // actions with intentionality
  var cae = []; // cause and effect actions

  // the actions need relate to this state
  // XXX should I just explode the possible actions to begin with?
  // - or cache the results from the first run?
  this.availableActions.forEach(function(action) {
    if(cae.length && action.causeAndEffect)
      // if we have cause and effect actions,
      // then they are the only ones that will be returned this round
      // so if this is NOT a CAE action, then we can skip it
      return true;
    action.tryTransition(that).forEach(function(glue) {
      (action.causeAndEffect?cae:awi).push({ action: action, glue: glue });
    });
  });

  // TODO do we need to keep planning with automatic actions, even when we reach the goal?
  // - what does this mean about "thinking ahead"?
  // - how do we know when to stop thinking ahead?
  // - does it matter at this level (lowest level planning?)
  // - what will higher level planning look like? what will it use? won't it be the same?
  // - do we need a configuration option? something that gets passed in?
  // - do the actions themselves get the weight (consume more actions until we've 'had enough')
  return (cae.length?cae:awi);
};

// path.State.matches
// AC: subgraph.match(unitOnly: false)
BlueprintState.prototype.matches = function(blueprintstate) {
  if(!this.state.concrete)
    // TODO do I throw an error or silently fail? (return false)
    throw new Error('blueprint states must be concrete to plan from');
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
    return [];

  // we have a set of subgraphs that match
  // we only care about the ideas that match
  // FIXME can I think of any situation where I want the ID and not the blueprint?
  // - why is this not returning blueprint.load(result.idea)?
  return matches.map(function(m) {
    return m.getIdea(result);
  });
};