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

exports.keyup = {};
exports.keydown = {
  discrete: function($event) {
    var used = true;
    switch($event.keyCode) {
      case 37: game.cave.agent.dt = -Math.PI / 2; break;
      case 38: game.cave.agent.da = config.room.spacing; break;
      case 39: game.cave.agent.dt = Math.PI / 2; break;
//      case 40: game.cave.agent.da = 0; break;
      case 32: used = (config.game.timing === 'static'); break; // noop
      // TODO grab
      // TODO fire
      // TODO exit
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
      case 37: game.cave.agent.dt = Math.max(game.cave.agent.dt-config.agent.torque, -config.agent.dt_limit); break;
      case 38: game.cave.agent.da = Math.min(game.cave.agent.da+config.agent.acceleration, config.agent.da_limit); break;
      case 39: game.cave.agent.dt = Math.min(game.cave.agent.dt+config.agent.torque, config.agent.dt_limit); break;
      case 40: game.cave.agent.da = Math.max(game.cave.agent.da-config.agent.acceleration, 0); break;
      case 32: used = (config.game.timing === 'static'); break; // noop
      // TODO grab
      // TODO fire
      // TODO exit
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
