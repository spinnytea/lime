'use strict';

var agent = exports.agent = {};
var room = exports.room = {};
var pit = exports.pit = {};
var grain = exports.grain = { continuous: {} };
var timing = exports.timing = {};
exports.game = {
  // if these are changed while a game is running... the results will be unpredictable
  // XXX enumerate lists of available options? (so we don't have magic strings)
  chance: 'deterministic',
  grain: 'discrete',
  observable: 'fully',
  timing: 'static',
  apriori: 'known',
  agents: 'single',
  roomCount: 10,
};

// how big are the agents
agent.radius = 12;
Object.defineProperty(agent, 'diameter', { get: function() { return agent.radius * 2; } });

// TODO config based on refresh rate; something like "turns per second"
// TODO better names
agent.acceleration = 1; // TODO config
agent.top_speed = 12; // TODO config
agent.turn_acceleration = Math.PI/40; // TODO config
agent.top_turn_speed = Math.PI/8; // TODO config

// how big the room is
room.radius = 48;
Object.defineProperty(room, 'diameter', { get: function() { return room.radius * 2; } });
// how far away to place the rooms from each other
// this needs to be smaller than the diameter. This also means that the agent might be in two rooms at once
Object.defineProperty(room, 'spacing', { get: function() { return room.radius * 1.8; } });
// computer math isn't perfect, so we need to have a little bit of leeway in our comparisons
Object.defineProperty(room, 'spacing_err', { get: function() { return room.spacing - 1; } });

// How likely is it for a pit to be generated after we have placed the exit and the gold
pit.probability = 0.5;

// how many rooms should we generate when branching?
grain.continuous.branches = 6;

// how long do we wait between updates
// TODO one delay for each grain continuous/dynamic
timing.updateDelay = 100; // TODO config

// TODO scoring