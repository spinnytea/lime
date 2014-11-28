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


var forward_velocity = 0;
var turn_valocity = 0;

exports.newgame = function() {
  forward_velocity = 0;
  turn_valocity = 0;
};

exports.update = {
  discrete: angular.noop,
  continuous: function() {
    game.cave.agent.r += turn_valocity;
    game.cave.agent.forward(forward_velocity);
  },
};

// TODO display keys on screen
exports.keyup = {};
exports.keydown = {
  discrete: function($event) {
    var used = true;
    switch($event.keyCode) {
      case 37: game.cave.agent.r -= Math.PI / 2; break;
      case 38: game.cave.agent.forward(config.room.spacing); break;
      case 39: game.cave.agent.r += Math.PI / 2; break;
      default:
        used = false;
    }
    if(used) {
      $event.preventDefault();
      game.update();
    }
  },
  continuous: function($event) {
    var used = true;
    switch($event.keyCode) {
      case 37: turn_valocity = Math.max(turn_valocity-config.agent.turn_acceleration, -config.agent.top_turn_speed); break;
      case 38: forward_velocity = Math.min(forward_velocity+config.agent.acceleration, config.agent.top_speed); break;
      case 39: turn_valocity = Math.min(turn_valocity+config.agent.turn_acceleration, config.agent.top_turn_speed); break;
      case 40: forward_velocity = Math.max(forward_velocity-config.agent.acceleration, 0); break;
      default:
        used = false;
    }
    if(used) {
      $event.preventDefault();
    }
  },
};
