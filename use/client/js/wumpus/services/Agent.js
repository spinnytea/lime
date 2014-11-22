'use strict';

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

module.exports = angular.module('lime.client.wumpus.Agent', []);
module.exports.service('lime.client.wumpus.wumpus', [ Agent ]);
module.exports.service('lime.client.wumpus.agent', [
  'lime.client.wumpus.wumpus',
  function(wumpus) {
    return new Agent({ hasGold: false, wumpus: wumpus });
  }
]);
