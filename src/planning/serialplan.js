'use strict';
// this builds on a blueprint to represent a set of serial steps
// if a blueprint is a single step, then this is a list of steps
//
// you shouldn't need to use "new serialplan.Action" (SerialAction)
// instead, you can use "planner.create"
var _ = require('lodash');
var Promise = require('bluebird');
var blueprint = require('./primitives/blueprint');
var planner = require('./planner');
var subgraph = require('../database/subgraph');

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
  var originalState = state;

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
        that.plans[i].tryTransition(curr.state).forEach(function(glue) {
          var glues = [];
          Array.prototype.push.apply(glues, curr.glues);
          glues.push(glue);

          // no need to apply the action on the last step
          // - unless we are going to use it later
          // reuse the state argument
          state = undefined;
          if(i < that.plans.length - 1 || that.transitions.length > 0)
            state = that.plans[i].apply(curr.state, glue);

          nextList.push({ glues: glues, state: state });
        });
      }
    });

    // swap curr and next
    currList = nextList;
  }

  // now just pull out the glue lists
  return currList.map(function(curr) {
    if(that.transitions.length > 0) {
      // turn our last state into a goal
      //
      // all of the changes that got us to the final state (curr.state) where done with other requirements/transitions
      // so we need to figure out how that relates to this set of requirements/transitions (what was the goal of all these changes)
      // because it's very likely that there were other things that changed, too
      // only THESE transitions should define the end goal
      //
      // we need to recover the vertex map of these requirements; they were calculated at some point in time, but discarded
      // (they got turned into the serial plan that exists now; there isn't much room for the old set)
      // TODO can we save the vertexMap? ~ when the stub is recalculated
      // - it doesn't look like we can; most solveAt 'immediate' and 'create' occur before we have a glue

      // these are all the possibilities matches
      var result = subgraph.match(originalState.state, that.requirements);
      // here are all the goals from all those results
      var goals = result.map(function(vertexMap) { return subgraph.createTransitionedGoal(originalState.state, that.transitions, vertexMap); });
      // these are all the goals that are the same as our result
      var matchingGoals = goals.filter(function(g) { return subgraph.match(curr.state.state, g).length; });

      // I don't know how either of these cases could happen...
      if(matchingGoals.length === 0) {
        console.log('serialplan.tryTransition with this.transitions:no matches');
      } else if(matchingGoals.length > 1) {
        console.log('serialplan.tryTransition with this.transitions:too many matches:', matchingGoals.length);
      }

      // if there are no matches (for some reason) then it will just be undefined, and we just won't be able to replan this step
      curr.glues.goal = matchingGoals[0];
    }

    return curr.glues;
  });
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

  return new Promise(function(resolve, reject) {
    var idx = -1;

    function step() {
      idx++;
      if(idx === plans.length)
        resolve();
      else
        plans[idx].scheduleBlueprint(state, glue[idx])
          .then(step, function() {
            if(glue.goal) {
              // if it fails, instead of rejecting immediately, we should replan towards the goal(s)

              var plan = planner.create(state, new blueprint.State(glue.goal, []));
              if(plan) {
                var glue2 = plan.tryTransition(state);
                if(glue2.length) {
                  return plan.scheduleBlueprint(state, glue2[0]).then(resolve, reject);
                }
              }
            }

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

// blueprint.prepSave
SerialAction.prototype.prepSave = function() {
  return {
    idea: this.idea,
    transitions: this.transitions,
    causeAndEffect: this.causeAndEffect,
    plans: this.plans.map(function(p) { return p.save(); })
    //// we can derive the requirements from the first plan
    //requirements: subgraph.stringify(this.requirements),
    //// fact is, we can just derive anything from the plan list
    //_myRunCost: this._myRunCost,
  };
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
