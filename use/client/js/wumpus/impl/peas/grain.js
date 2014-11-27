'use strict';

var config = require('../config');
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