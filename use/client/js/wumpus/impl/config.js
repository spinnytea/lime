'use strict';

var agent = exports.agent = {};
var room = exports.room = {};
var pit = exports.pit = {};
var grain = exports.grain = { continuous: {} };
exports.game = {
  // if these are changed while a game is running... the results will be unpredictable
  // XXX enumerate lists of available options? (so we don't have magic strings)
  chance: 'deterministic',
  grain: 'discrete',
  observable: 'fully',
  timing: 'static',
  apriori: 'known',
  roomCount: 10,
};

// how big are the agents
agent.radius = 12;
agent.diameter = agent.radius * 2;

// how big the room is
room.radius = 48;
room.diameter = exports.room.radius * 2;
// how far away to place the rooms from each other
// this needs to be smaller than the diameter. This also means that the agent might be in two rooms at once
room.spacing = exports.room.diameter - 10;
// computer math isn't perfect, so we need to have a little bit of leeway in our comparisons
room.spacing_err = exports.room.spacing - 1;

// How likely is it for a pit to be generated after we have placed the exit and the gold
pit.probability = 0.5;

// how many rooms should we generate when branching?
grain.continuous.branches = 6;
