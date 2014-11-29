'use strict';

var config = require('./config');
var grain = require('./peas/grain');
var Room = require('./room');

function randInt(max) { return Math.floor(Math.random() * max); }

var cave = exports.cave = undefined;

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
  cave = exports.cave = new Cave();

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
      if(cave.wumpus && Math.random() < 1.0 / goldRoom) {
        cave.wumpus.placeInRoom(room);
        placedWumpus = true;
      }
    } else if(cave.rooms.length === goldRoom) {
      // if the wumpus hasn't been placed yet, do it now
      if(cave.wumpus && !placedWumpus) {
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
    // find the bounds of the game
    // TODO change bounds with observability
    cave.bounds.minx = Math.min(cave.bounds.minx, room.x-config.room.radius);
    cave.bounds.maxx = Math.max(cave.bounds.maxx, room.x+config.room.radius);
    cave.bounds.miny = Math.min(cave.bounds.miny, room.y-config.room.radius);
    cave.bounds.maxy = Math.max(cave.bounds.maxy, room.y+config.room.radius);
    // now add all the nearby rooms
    // this is reflexive
    Array.prototype.push.apply(room.nearbyRooms, nearbyRooms);
    i=0; for(; i<nearbyRooms.length; i++)
      nearbyRooms[i].nearbyRooms.push(room);

    // add branches from the current room
    Array.prototype.push.apply(frontier, grain.roomFrontier[config.game.grain](room));
  } // end room_while
};

exports.update = function() {
  // world updates
  cave.agent.update();
  // TODO update wumpus

  // check status
  if(cave.agent.inRooms.some(function(room) { return room.hasPit; }))
    cave.agent.alive = false;
  if(cave.wumpus && cave.wumpus.distance(cave.agent) < config.agent.diameter)
    cave.agent.alive = false;

  // config settings
  grain.update[config.game.grain]();
};


function Cave() {
  if(config.game.agents === 'multi')
    this.wumpus = new Agent();

  this.agent = new Agent({ hasGold: false });
  this.rooms = [];
  this.bounds = {
    minx: -config.room.radius, maxx: config.room.radius,
    miny: -config.room.radius, maxy: config.room.radius,
  };
}
Cave.prototype.isWin = function() {
  return this.agent.alive &&
    this.agent.inRooms.length === 0 &&
    this.agent.hasGold;
};


function Agent(options) {
  angular.extend(this, {
    x: 0,
    y: 0,
    r: 0, // the direction the agent facing
    da: 0, // derivative of acceleration (velocity)
    dt: 0, // derivative of torque (angular velocity)
    alive: true,
  }, options);

  this.inRooms = [];
}

Agent.prototype.placeInRoom = function(room) {
  // update position
  this.x = room.x;
  this.y = room.y;

  if(this === cave.wumpus) {
    // make sure the wumpus is facing away from the agent
    // (this way, if the wumpus is next to the agent, the agent wont immediately lose if it isn't facing the wumpus)
    this.r = Math.atan2(this.y-cave.agent.y, this.x-cave.agent.x) + Math.PI*2;
    if(config.game.grain === 'discrete')
      // "round" to the nearest cardinal direction
      this.r = Math.floor(this.r/(Math.PI/2))*(Math.PI/2);
  }
  this.inRooms = [ room ];
};

Agent.prototype.distance = Room.prototype.distance;

Agent.prototype.update = function() {
  // all the turn regardless
  this.r += this.dt;

  // calculate where we will be if we move forward
  // if we are no longer in any rooms, then we cannot move
  var that = {
    x: this.x + Math.cos(this.r) * this.da,
    y: this.y + Math.sin(this.r) * this.da,
  };
  var inRooms = cave.rooms.filter(function(room) {
    return room.distance(that) < config.room.radius;
  });

  // if we can move forward, then update our location
  if(inRooms.length > 0) {
    this.x = that.x;
    this.y = that.y;

    // update the view information
    if(config.game.observable === 'partially') {
      this.inRooms.forEach(function(room) { room.visible = false; });
      inRooms.forEach(function(room) { room.visible = true; });
    }
    this.inRooms = inRooms;
  }
};