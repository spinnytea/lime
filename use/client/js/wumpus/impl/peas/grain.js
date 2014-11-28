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

exports.keyup = {
  discrete: angular.noop,
};
exports.keydown = {
  discrete: function($event) {
    var used = true;
    switch($event.keyCode) {
      case 37: game.cave.agent.r -= Math.PI / 2; break;
      case 38: game.cave.agent.forward(); break;
      case 39: game.cave.agent.r += Math.PI / 2; break;
      default:
        used = false;
    }
    if(used)
      $event.preventDefault();
  },
};
