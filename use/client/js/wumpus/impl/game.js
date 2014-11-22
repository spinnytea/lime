'use strict';

var Agent = require('./agent');
var Room = require('./room');
var grain = require('./peas/grain');

exports.cave = undefined;

// required rooms:
// (if we generate the rooms in this manner using this algorithm, then we can guarantee that there are not pits between the exit and the gold)
// (some of the games will be stupid easy, but they will always be solvable)
// . exit   - first room
// . wumpus - randomly placed between exit (exclusive) and gold (inclusive)
// . gold   - placed at roomCount/2
// . pit    - after gold is placed, generated with some probability (e.g. n/(roomCount/2), where n is a constant number of rooms we'd like to see)
exports.generate = function(config) {
  // pull out our arguments
  var roomCount = Math.max(config.roomCount, 4);

  // the room where the cold will be placed
  var goldRoom = Math.floor(roomCount / 2);
  // if the wumpus has not been placed by the time we get to the gold, we need to place it then
  var placedWumpus = false;

  // we are ultimately building this as the game object
  // create a new one on exports
  // the locally scoped name is for ease of access
  var cave = exports.cave = new Cave();

  // This will use an implementation of Prim's Algorithm
  var frontier = [];

  // setup the first room
  var room = new Room(0, 0, { hasExit: true });
  // stick the agent in this room
  cave.agent.placeInRoom(room);
  // and place this room on the map
  cave.rooms.push(room);

  Array.prototype.push.apply(frontier, grain.roomFrontier[config.grain]);

  // TODO build cave.rooms until we hit the room count (or run out of rooms)
  console.log(goldRoom);
  console.log(placedWumpus);
};

function Cave() {
  this.wumpus = new Agent();
  this.agent = new Agent({ hasGold: false, wumpus: this.wumpus });
  this.rooms = [];
}
Cave.prototype.isWin = function() {
  return this.agent.alive &&
    this.agent.inRooms.length === 0 &&
    this.agent.hasGold;
};
Cave.prototype.isLose = function() {
  return !this.agent.alive;
};
