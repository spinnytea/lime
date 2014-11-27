'use strict';

var config = require('./config');
var grain = require('./peas/grain');
var Room = require('./room');

function randInt(max) { return Math.floor(Math.random() * max); }

exports.cave = undefined;

// required rooms:
// (if we generate the rooms in this manner using this algorithm, then we can guarantee that there are not pits between the exit and the gold)
// (some of the games will be stupid easy, but they will always be solvable)
// . exit   - first room
// . wumpus - randomly placed between exit (exclusive) and gold (inclusive)
// . gold   - placed at roomCount/2
// . pit    - after gold is placed, generated with some probability (e.g. n/(roomCount/2), where n is a constant number of rooms we'd like to see)
exports.generate = function() {
  // pull out our arguments
  var roomCount = Math.max(config.game.roomCount || 0, 4);

  // the room where the cold will be placed
  var goldRoom = Math.floor(roomCount / 2);
  // if the wumpus has not been placed by the time we get to the gold, we need to place it then
  var placedWumpus = false;

  // we are ultimately building this as the game object
  // create a new one on exports
  // the locally scoped name is for ease of access
  var cave = exports.cave = new Cave();

  // setup the first room
  var room = new Room(0, 0, cave, { hasExit: true });
  // stick the agent in this room
  cave.agent.placeInRoom(room);
  // and place this room on the map
  cave.rooms.push(room);
  // update visibility (if it's already observable, so be it)
  room.visible = true;

  // This will use an implementation of Prim's Algorithm
  var frontier = [];
  // seed the frontier with our first room
  Array.prototype.push.apply(frontier, grain.roomFrontier[config.game.grain](room));

  // these are all the rooms that this new room connects to
  var nearbyRooms = [];

  // we can't keep looking if we run out of rooms (is such a thing possible? maybe)
  // we ultimately want to stop once we have the desired room count
  room_while:
  while(frontier.length > 0 && cave.rooms.length < roomCount) {
    // get another from the queue
    room = frontier.splice(randInt(frontier.length), 1)[0];

    // rebuild the list of nearby rooms
    nearbyRooms.splice(0);
    var i=0; for(; i<cave.rooms.length; i++) {
      var r = cave.rooms[i];
      var dist = room.distance(r);
      if(dist < config.room.spacing_err)
        continue room_while;
      else if(dist < config.room.diameter)
        nearbyRooms.push(r);
    }

    // add stats to the room
    if(cave.rooms.length < goldRoom) {
      // put the wumpus in a random room
      //
      // (each time we call wumpus.placeInRoom, it will be moved to that room)
      // notice that we don't check to see if it has already been placed
      // this way there is a slightly higher chance that it will be farther away from the start
      if(Math.random() < 1.0 / goldRoom) {
        cave.wumpus.placeInRoom(room);
        placedWumpus = true;
      }
    } else if(cave.rooms.length === goldRoom) {
      // if the wumpus hasn't been placed yet, do it now
      if(!placedWumpus) {
        cave.wumpus.placeInRoom(room);
        placedWumpus = true;
      }
      room.hasGold = true;
    } else if(cave.rooms.length > goldRoom) {
      if(Math.random() < config.pit.probability)
        room.hasPit = true;
    }

    // add the room to the map
    cave.rooms.push(room);
    // now add all the nearby rooms
    // this is reflexive
    Array.prototype.push.apply(room.nearbyRooms, nearbyRooms);
    i=0; for(; i<nearbyRooms.length; i++)
      nearbyRooms[i].nearbyRooms.push(room);

    // add branches from the current room
    Array.prototype.push.apply(frontier, grain.roomFrontier[config.game.grain](room));
  } // end room_while
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
  // update position
  this.x = room.x;
  this.y = room.y;

  // empty inRooms, and put room in inRooms
  this.inRooms.splice(0, this.inRooms.length, room);
};