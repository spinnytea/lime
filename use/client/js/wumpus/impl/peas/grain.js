'use strict';

var config = require('../config');
var Room = require('../room');

exports.roomFrontier = {
  discrete: function(room) {
    return [
      new Room(room.x - config.room.spacing, room.y),
      new Room(room.x + config.room.spacing, room.y),
      new Room(room.x, room.y - config.room.spacing),
      new Room(room.x, room.y + config.room.spacing),
    ];
  },
};