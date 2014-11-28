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
var turn_velocity = 0;

exports.newgame = function() {
  forward_velocity = 0;
  turn_velocity = 0;
};

exports.update = {
  discrete: function() {
    if(turn_velocity) {
      game.cave.agent.r += turn_velocity;
      turn_velocity = 0;
    }
    if(forward_velocity) {
      game.cave.agent.forward(forward_velocity);
      forward_velocity = 0;
    }
  },
  continuous: function() {
    game.cave.agent.r += turn_velocity;
    game.cave.agent.forward(forward_velocity);
  },
};

// TODO display keys on screen
exports.keyup = {};
exports.keydown = {
  discrete: function($event) {
    var used = true;
    switch($event.keyCode) {
      case 37: turn_velocity = -Math.PI / 2; break;
      case 38: forward_velocity = config.room.spacing; break;
      case 39: turn_velocity = Math.PI / 2; break;
      case 40: forward_velocity = 0; break;
      case 32: break; // noop
      default:
        used = false;
    }
    if(used) {
      $event.preventDefault();
      if(config.game.timing === 'static')
        game.update();
    }
  },
  continuous: function($event) {
    var used = true;
    switch($event.keyCode) {
      case 37: turn_velocity = Math.max(turn_velocity-config.agent.turn_acceleration, -config.agent.top_turn_speed); break;
      case 38: forward_velocity = Math.min(forward_velocity+config.agent.acceleration, config.agent.top_speed); break;
      case 39: turn_velocity = Math.min(turn_velocity+config.agent.turn_acceleration, config.agent.top_turn_speed); break;
      case 40: forward_velocity = Math.max(forward_velocity-config.agent.acceleration, 0); break;
      case 32: break; // noop
      default:
        used = false;
    }
    if(used) {
      $event.preventDefault();
      if(config.game.timing === 'static')
        game.update();
    }
  },
};
