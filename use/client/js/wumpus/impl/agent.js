'use strict';

module.exports = Agent;

function Agent(options) {
  angular.extend(this, {
    x: 0,
    y: 0,
    r: 0, // the direction the agent facing
    alive: true,
  }, options);

  this.inRooms = [];
}

Agent.prototype.placeInRoom = function(room) {
  this.x = room.x;
  this.y = room.y;

  // empty inRooms, and put room in inRooms
  this.inRooms.splice(0, this.inRooms.length, room);
};
