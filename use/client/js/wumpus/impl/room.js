'use strict';

var config = require('./config');

module.exports = Room;

//var RADIUS = 48;
//var SPACING = RADIUS * 2 - 10;
//var SPACING_ERR = SPACING - 1;
function Room(x, y, cave, options) {
  this.x = x;
  this.y = y;
  this.cave = cave;
  this.nearbyRooms = [];

  angular.extend(this, {
    hasPit: false,
    hasGold: false,
    hasExit: false,
    visible: (config.game.observable === 'fully'),
  }, options);
}

Room.prototype.senses = function() {
  return this.nearbyRooms.reduce(function(senses, room) {
    senses.breeze = senses.breeze || room.hasPit;
    senses.glitter = senses.glitter || room.hasGold;
    senses.stench = senses.stench || (senses.breathing && room.cave.wumpus.inRooms.indexOf(room) !== -1);
    return senses;
  }, {
    breeze: false, glitter: false, stench: false,
    breathing: (this.cave.wumpus && this.cave.wumpus.alive),
    nearbyCount: this.nearbyRooms.length,
  });
};

Room.prototype.distance = function(obj) {
  return Math.sqrt(Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y, 2));
};