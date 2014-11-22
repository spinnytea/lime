'use strict';

module.exports = Room;

//var RADIUS = 48;
//var SPACING = RADIUS * 2 - 10;
//var SPACING_ERR = SPACING - 1;
function Room(x, y, options) {
  this.x = x;
  this.y = y;
  this.nearbyRooms = [];

  angular.extend(this, {
    hasPit: false,
    hasGold: false,
    hasExit: false,
  }, options);
}

Room.prototype.senses = function() {
  return this.nearbyRooms.reduce(function(senses, room) {
    senses.breeze |= room.hasPit;
    senses.glitter |= room.hasGold;
    senses.breeze |= room.hasExit;
    // TODO wumpus breathing
    return senses;
  }, { breeze: false, glitter: false, stench: false, breathing: false });
};
