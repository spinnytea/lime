'use strict';
// this builds on a blueprint to represent a set of serial steps
// if a blueprint is a single step, then this is a list of steps
//
// you shouldn't need to use "new serialplan.Action" (SerialAction)
// instead, you can use "planner.create"
var _ = require('lodash');
var Promise = require('bluebird');
var blueprint = require('./primitives/blueprint');
var ideas = require('../database/ideas');
var links = require('../database/links');

// @param plans: blueprint.Action
//  - the steps that make up this macro action
function SerialAction(plans) {
  blueprint.Action.call(this);

  this.plans = plans.filter(function(p) {
    if(p instanceof SerialAction) {
      if(p.plans.length === 0)
        return false;
    }
    return true;
  });
  if(plans.length > 0)
    this.requirements = plans[0].requirements;

  // add the cost of all the plans
  // if there is no cost (~no plans), then add a deterrent cost
  this._myRunCost = _.reduce(plans, function(sum, bp) {
    return sum + bp.runCost();
  }, 0) || 1;
}
_.extend(SerialAction.prototype, blueprint.Action.prototype);

// blueprint.runCost
SerialAction.prototype.runCost = function() {
  return this._myRunCost;
};

// blueprint.tryTransition
// SerialAction needs a list of mappings
SerialAction.prototype.tryTransition = function(state) {
  var that = this;

  // because each action needs it's own mappings
  // and each action could come after any mapping
  // we need to build a list of every valid mapping tree
  if(that.plans.length === 0)
    return [];

  // { glues: [], state: state }
  // we are interested in the list of glues
  // we need the latest state so we can resolve the next glue
  var currList = [];

  that.plans[0].tryTransition(state).forEach(function(glue) {
    currList.push({ glues: [glue], state: that.plans[0].apply(state, glue) });
  });

  // use the currList to process this step
  // accumulate the results
  // at the end, we'll swap tha lists
  var nextList;
  for(var i = 1; i < that.plans.length; i++) {
    nextList = [];

    currList.forEach(function(curr) {
      var action = that.plans[i];

      if(action instanceof SerialAction && action.plans.length === 0) {
        // if we are going to allow serial plans with no actions,
        // then this is essentially a noop
        // and if it's a noop, then we need to account for it here
        // there aren't any transitions to perform, which would halt the planning
        // (no transitions means unable to transition)
        curr.glues.push([]);
        nextList.push(curr);
      } else {
        var transitions = that.plans[i].tryTransition(curr.state);
        transitions.forEach(function(glue) {
          var glues = [];
          Array.prototype.push.apply(glues, curr.glues);
          glues.push(glue);

          // no need to apply the action on the last step
          // reuse the state argument
          state = undefined;
          if(i < that.plans.length - 1)
            state = that.plans[i].apply(curr.state, glue);

          nextList.push({ glues: glues, state: state });
        });
      }
    });

    // swap curr and next
    currList = nextList;
  }

  // now just pull out the glue lists
  return currList.map(function(curr) { return curr.glues; });
};

// blueprint.runBlueprint
SerialAction.prototype.runBlueprint = function(state, glue) {
  this.plans.forEach(function(plan, idx) {
    plan.runBlueprint(state, glue[idx]);
  });
};

// blueprint.scheduleBlueprint
SerialAction.prototype.scheduleBlueprint = function(state, glue) {
  var plans = this.plans;
  // in case we fail, we need to have a goal based on the original state
  // XXX can we lazy eval this during the plans.scheduleBlueprint.then
  //var goalState = this.apply(state, glue);
  return new Promise(function(resolve, reject) {
    var idx = -1;

    function step() {
      idx++;
      if(idx === plans.length)
        resolve();
      else
        plans[idx].scheduleBlueprint(state, glue[idx])
          .then(step, function() {
            // TODO if it fails, instead of rejecting, we should replan towards the goal(s)

            // we don't need the WHOLE goal state
            // we only need the parts of the goal that are affected by the transitions
            // so let's create a new goal that only contains the transitioned
            // (all other nodes are purely structural; so if we can match the transition vertex to the state, we can grab the represented id)
            //
            // if we set all the identified thoughts, then the only thing that will run is the matchers
            //
            // the transitions are key
            // if a blueprint defines transitions, then that's as far as we need to go
            // and deeper transitions are probably just a means to this, but we don't need them for goals
            // so... we should only replan stubs?
            // if this is a stub, do we replan it? that makes things easier
            // if not, then bubble up to a parent serial plan
            // what about deeper? if this CONTAINS stubs, do we still want to go down ... let's say no for now

            //void(goalState);

            reject();
          });
    }

    step();
  });
};

// path.apply
SerialAction.prototype.apply = function(state, glue) {
  return _.reduce(this.plans, function(result, plan, idx) {
    return plan.apply(result, glue[idx]);
  }, state);
};

SerialAction.prototype.save = function() {
  var idea;
  if(this.idea)
    idea = ideas.load(this.idea);
  else {
    idea = ideas.create();
    idea.link(links.list.context, blueprint.context);
    this.idea = idea.id;
  }

  idea.update({
    type: 'blueprint',
    subtype: 'SerialAction',
    blueprint: {
      idea: this.idea,
      transitions: this.transitions,
      causeAndEffect: this.causeAndEffect,
      plans: this.plans.map(function(p) { return p.save(); })
      // we can derive the requirements from the first plan
//      requirements: subgraph.stringify(this.requirements),
      // fact is, we can just derive anything from the plan list
//      _myRunCost: this._myRunCost,
    }
  });

  return this.idea;
};

exports.Action = SerialAction;
blueprint.loaders.SerialAction = function(bp) {
  var plans = bp.plans.map(function(id) { return blueprint.load(id); });
  var sa = new SerialAction(plans);
  sa.idea = bp.idea;
  sa.transitions = bp.transitions;
  sa.causeAndEffect = bp.causeAndEffect;
  return sa;
};
