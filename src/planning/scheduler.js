'use strict';
var Promise = require('bluebird');

var subgraph = require('../database/subgraph');

// this could be the central service that runs the LM
//
// for now, you can submit plans to it, and it will wait until the goal has been met to start the next stage of the plan

var schedules = [];

// @param context: the subgraph that is the world state
// @param goal: the condition we are waiting to meet
// @return a promise that will be resolved when the goal is met, or rejected if we timeout
// XXX add options to configure when goals expire
exports.defer = function(context, goal) {
  return new Promise(function(resolve, reject) {
    // TODO subgraph.match unitOnly = false
    // - save vertexMap
    // - use it to optimize subgraph.match
    schedules.push({
      context: context,
      goal: goal,
      resolve: resolve,
      reject: reject
    });
  });
};

// check all goals to see if any of them match
exports.check = function() {
  // TODO (timing) don't reject promises immediately; but then how long do we wait?
  schedules.forEach(function(s) {
    if(subgraph.match(s.context, s.goal).length > 0)
      s.resolve();
    else
      s.reject();
  });
  schedules.splice(0);

  return Promise.resolve();
};