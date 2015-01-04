'use strict';

// TODO incorporate advanced config into environment config (with a toggle)
var agent = exports.agent = {};
var room = exports.room = {};
var misc = exports.misc = {
  pit: {},
  arrow: {},
};

var chance = exports.chance = {};
var grain = exports.grain = { continuous: {} };
var timing = exports.timing = {};
var multi = exports.multi = {};
exports.game = {
  // if these are changed while a game is running... the results will be unpredictable
  // XXX enumerate lists of available options? (so we don't have magic strings)
  chance: 'deterministic', // stochastic
  grain: 'discrete', // continuous
  observable: 'fully', // partially
  timing: 'static', // dynamic
  agents: 'single', // multi
  roomCount: 10,
  player: 'lemon', // person
};

// how big are the agents
agent.radius = 12;
Object.defineProperty(agent, 'diameter', { get: function() { return agent.radius * 2; } });

// XXX config based on refresh rate; something like "turns per second"
// XXX apply force based on update interval
agent.acceleration = 1;
agent.da_limit = 12;
agent.torque = Math.PI/40;
agent.dt_limit = Math.PI/8;
multi.wumpus_da_limit = 2;

// how big the room is
room.radius = 48;
Object.defineProperty(room, 'diameter', { get: function() { return room.radius * 2; } });
// how far away to place the rooms from each other
// this needs to be smaller than the diameter. This also means that the agent might be in two rooms at once
// Note: for discrete to work, this number needs to terminate
Object.defineProperty(room, 'spacing', { get: function() { return room.radius * 1.8; }, enumerable: true });
// computer math isn't perfect, so we need to have a little bit of leeway in our comparisons
Object.defineProperty(room, 'spacing_err', { get: function() { return room.spacing - 1; } });

// How likely is it for a pit to be generated after we have placed the exit and the gold
misc.pit.probability = 0.5;
// some properties about firing an arrow
Object.defineProperty(misc.arrow, 'radius', { get: function() { return agent.radius/4; }, enumerable: true });
Object.defineProperty(misc.arrow, 'speed', { get: function() { return agent.radius/4; }, enumerable: true });


// how likely is it for the actions to mess up?
chance.discrete = 0.1;
chance.continuous = 0.05;

// how many rooms should we generate when branching?
grain.continuous.branches = 6;

// how long do we wait between updates
// (only applies to dynamic)
timing.updatesPerSecond = {
  discrete: 2,
  continuous: 10,
};
Object.defineProperty(timing, 'updateDelay', { get: function() { return 1000/timing.updatesPerSecond[exports.game.grain]; } });

