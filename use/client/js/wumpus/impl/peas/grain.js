'use strict';

var config = require('../config');
var game = require('../game');
var Room = require('../room');

exports.roomFrontier = {
  discrete: function(room) {
    return [
      new Room(room.x - config.room.spacing, room.y, room.cave),
      new Room(room.x + config.room.spacing, room.y, room.cave),
      new Room(room.x, room.y - config.room.spacing, room.cave),
      new Room(room.x, room.y + config.room.spacing, room.cave),
    ];
  },
  continuous: function(room) {
    var ret = [];
    while(ret.length < config.grain.continuous.branches) {
      var r = Math.random() * 2 * Math.PI;
			ret.push(new Room(
			  Math.cos(r) * config.room.spacing + room.x,
			  Math.sin(r) * config.room.spacing + room.y,
			  room.cave
			));
    }
    return ret;
  },
};


exports.update = {
  discrete: function() {
    // reset the player's movement
    game.cave.agent.da = 0;
    game.cave.agent.dt = 0;

    // reset the wumpus movement
    if(game.cave.wumpus) {
      game.cave.wumpus.da = 0;
      game.cave.wumpus.dt = 0;
    }
  },
  continuous: angular.noop,
};

exports.move = {
  discrete: {
    left: function(agent) { agent.dt = -Math.PI / 2; },
    right: function(agent) { agent.dt = Math.PI / 2; },
    up: function(agent) { agent.da = config.room.spacing; },
  },
  continuous: {
    left: function(agent) { agent.dt = Math.max(agent.dt-config.agent.torque, -config.agent.dt_limit); },
    right: function(agent) { agent.dt = Math.min(agent.dt+config.agent.torque, config.agent.dt_limit); },
    up: function(agent) { agent.da = Math.min(agent.da+config.agent.acceleration, config.agent.da_limit); },
    down: function(agent) { agent.da = Math.max(agent.da-config.agent.acceleration, 0); },
  },
};
