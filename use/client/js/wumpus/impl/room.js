'use strict';

var config = require('./config');

// don't start with zero
// because reasons
// (actually, there is no reason; I just don't want these to be predictable in the first game)
var next_id = Math.floor(Math.random()*50)+50;

module.exports = Room;

//var RADIUS = 48;
//var SPACING = RADIUS * 2 - 10;
//var SPACING_ERR = SPACING - 1;
function Room(x, y, cave, options) {
  this.x = x;
  this.y = y;
  if(config.game.observable === 'fully')
    this.id = next_id++;
  Object.defineProperty(this, 'cave', { value: cave, writable: true, enumerable: false });
  Object.defineProperty(this, 'nearbyRooms', { value: [], writable: true, enumerable: false });

  angular.extend(this, {
    hasPit: false,
    hasGold: false,
    hasExit: false,
    visible: (config.game.observable === 'fully'),
  }, options);
}

Room.prototype.sense = function() {
  // TODO some of this is static; calculate that stuff once
  return this.nearbyRooms.reduce(function(senses, room) {
    senses.sunlight = senses.sunlight || room.hasExit,
    senses.breeze = senses.breeze || room.hasPit;
    senses.glitter = senses.glitter || room.hasGold;
    senses.stench = senses.stench || (senses.breathing && room.cave.wumpus.inRooms.indexOf(room) !== -1);
    return senses;
  }, {
    sunlight: false, breeze: false, glitter: false, stench: false,
    // XXX remove breathing as a static sense
    // - once I have LM sensor impls and "sense" as an action, then I can "listen for a scream"
    // - in the original game, the wumpus screams when he dies
    // - but I don't know how to deal with the sensors and a sense of short duration
    // - (it can be heard everywhere for a few rounds)
    breathing: (this.cave.wumpus && this.cave.wumpus.alive),
  });
};

Room.prototype.distance = function(obj) {
  return Math.sqrt(Math.pow(this.x - obj.x, 2) + Math.pow(this.y - obj.y, 2));
};