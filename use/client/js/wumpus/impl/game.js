'use strict';

var agents = require('./peas/agents');
var config = require('./config');
var grain = require('./peas/grain');
var Room = require('./room');

function randInt(max) { return Math.floor(Math.random() * max); }

var cave = exports.cave = undefined;
exports.points = 0;
// used for timing:dynamic
var point_step = 0;

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
  exports.points = Math.pow(config.game.roomCount, 0.7)*4;
  if(config.game.chance === 'stochastic')
    exports.points += 5;
  if(config.game.observable === 'partially')
    exports.points *= 2;
  if(config.game.agents === 'multi')
    exports.points += 3;
  if(config.game.grain === 'continuous') {
    exports.points *= 6;
    if(config.game.timing === 'dynamic')
      exports.points /= (config.timing.updatesPerSecond.continuous/2);
  }
  // TODO play-test the points
  exports.points = Math.ceil(exports.points);

  // setup the first room
  var room = new Room(0, 0, cave, { hasExit: true });
  var firstRoom = room;
  // and place this room on the map
  cave.rooms.push(room);

  // This will use an implementation of Prim's Algorithm
  var frontier = [];
  // seed the frontier with our first room
  Array.prototype.push.apply(frontier, grain.roomFrontier[config.game.grain](room));

  // these are all the rooms that this new room connects to
  var nearbyRooms = [];

  // keep the rooms from bunching up too much
  // - this was configured for discrete (no 9x9 blocks; the room can't have 4 exists (N,S,E,W)
  // - this doesn't really effect continuous, but then again, continuous is already "interesting"
  function tooManyNearbyRooms() {
    return nearbyRooms.length > 3 ||
      nearbyRooms.some(function(r) { return r.nearbyRooms.length > 2; });
  }

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
    if(tooManyNearbyRooms())
      continue room_while;

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
      if(Math.random() < config.misc.pit.probability)
        room.hasPit = true;
    }

    // add the room to the map
    cave.rooms.push(room);
    // find the bounds of the game
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

  // put the agent in the first room
  // (this needs to be last because partial observability
  cave.agent.placeInRoom(firstRoom);
};

exports.keydown = function($event) {
  // XXX sense should be an action
  // - then the opacity needs to fall off with time
  // ---
  // - it's kind of disruptive for people
  // > should sensing be something that constantly happens?
  var used = true;
  switch($event.keyCode) {
    case 37: grain.move[config.game.grain].left(cave.agent); break;
    case 38: grain.move[config.game.grain].up(cave.agent); break;
    case 39: grain.move[config.game.grain].right(cave.agent); break;
    case 40:
      if(config.game.grain === 'continuous')
        grain.move.continuous.down(cave.agent);
      else
        used = false;
      break;
    case 32: used = (config.game.timing === 'static'); break; // noop
    case 71: grab(); break;
    case 69: exit(); break;
    case 70:
      if(config.game.agents === 'multi')
        fire();
      else
        used = false;
      break;
    default:
      used = false;
  }
  if(used) {
    $event.preventDefault();
    if(config.game.timing === 'static')
      exports.update();
  }
};

exports.update = function() {
  // world updates
  cave.agent.update();
  if(cave.wumpus) {
    agents.update.multi();
    cave.wumpus.update();
  }

  // check status
  if(cave.agent.inRooms.some(function(room) { return room.hasPit; }))
    cave.agent.alive = false;
  if(cave.wumpus && cave.wumpus.alive && cave.wumpus.distance(cave.agent) < config.agent.diameter)
    cave.agent.alive = false;

  if(cave.agent.alive && !cave.agent.win) {
    if(config.game.timing === 'static') {
      exports.points--;
    } else {
      if(point_step <= 0) {
        exports.points--;
        point_step = config.timing.updatesPerSecond[config.game.grain];
      } else {
        point_step--;
      }
    }
  }

  // config settings
  grain.update[config.game.grain]();
};

function grab() {
  if(cave.agent.alive && !cave.agent.hasGold) {
    // get the list of rooms that has gold
    // we could do inRooms.some, but we need a reference to the room
    var rooms = cave.agent.inRooms.filter(function(room) { return room.hasGold; });
    if(rooms.length === 1) {
      rooms[0].hasGold = false;
      cave.agent.hasGold = true;
    }
  }
}
function exit() {
  if(cave.agent.alive && cave.agent.hasGold) {
    // get the list of rooms that has exit
    // we could do inRooms.some, but we need a reference to the room
    var rooms = cave.agent.inRooms.filter(function(room) { return room.hasExit; });
    if(rooms.length === 1) {
      cave.agent.win = true;
    }
  }
}
function fire() {
  // simple ray tracing algorithm
  var arrow = { x: cave.agent.x, y: cave.agent.y };
  var r = cave.agent.r;

  function inSomeRoom(room) { return room.distance(arrow) < config.room.radius; }

  var count = 1000;
  while(count > 0) {
    arrow.x += Math.cos(r) * config.misc.arrow.speed;
    arrow.y += Math.sin(r) * config.misc.arrow.speed;
    count--;

    // hit wumpus
    if(cave.wumpus.distance(arrow) < config.agent.radius+config.misc.arrow.radius) {
      cave.wumpus.alive = false;
      count = 0;
    }

    // in at least one room
    if(!cave.rooms.some(inSomeRoom)) {
      count = 0;
    }
  }
}
//function fire() {
//  // http://mathworld.wolfram.com/Circle-LineIntersection.html
//  var r2 = config.room.radius*config.room.radius;
//  var d2 = Math.pow(Math.cos(cave.agent.r), 2) + Math.pow(Math.sin(cave.agent.r), 2);
//  var D2 = Math.pow((cave.agent.x-cave.wumpus.x+Math.cos(cave.agent.r))*(cave.agent.y-cave.wumpus.y) -
//    (cave.agent.x-cave.wumpus.x)*(cave.agent.y-cave.wumpus.y+Math.sin(cave.agent.r)), 2);
//
//  if(r2*d2 - D2 > 0) {
//    console.log('hit');
//    // XXX make this directional
//    // XXX if it hits a wall first
//    // - so we need to intersect all room walls
//    // - and allow it to pass through "doors"
//    // - which means we need to intersect rooms with rooms to find doors
//  }
//}


function Cave() {
  if(config.game.agents === 'multi')
    this.wumpus = new Agent();

  this.agent = new Agent({ hasGold: false, win: false });
  this.rooms = [];
  this.bounds = {
    minx: -config.room.radius, maxx: config.room.radius,
    miny: -config.room.radius, maxy: config.room.radius,
  };
}

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

  this.updateRooms([room]);
};

Agent.prototype.updateRooms = function(rooms) {
  // update the view information
  if(this === cave.agent && config.game.observable === 'partially') {
    // invisible current rooms
    this.inRooms.forEach(function(room) {
      room.visible = false;
      room.nearbyRooms.forEach(function(r) {
        r.visible = false;
      });
    });
    // visible new rooms
    rooms.forEach(function(room) {
      room.visible = true;
      room.nearbyRooms.forEach(function(r) {
        r.visible = true;
      });
    });
  }

  // regardless, update the room list
  this.inRooms = rooms;
};

// it's the same distance formula
Agent.prototype.distance = Room.prototype.distance;

Agent.prototype.update = function() {
  if(config.game.chance === 'stochastic' &&
      config.game.grain === 'discrete' &&
      Math.random() < config.chance.discrete)
    return;

  // all the turn regardless
  this.r += this.dt;
  // keep r in a reasonable range
  if(this.r > Math.PI) this.r -= Math.PI*2;
  if(this.r < -Math.PI) this.r += Math.PI*2;

  // calculate where we will be if we move forward
  // if we are no longer in any rooms, then we cannot move
  var that = {
    x: this.x + Math.cos(this.r) * this.da,
    y: this.y + Math.sin(this.r) * this.da,
  };
  if(config.game.chance === 'stochastic' &&
      config.game.grain === 'continuous' &&
      Math.random() < config.chance.continuous)  {
    that = {
      x: this.x + Math.cos(Math.random()*Math.PI*2) * Math.random() * this.da,
      y: this.y + Math.sin(Math.random()*Math.PI*2) * Math.random() * this.da,
    };
  }
  var inRooms = cave.rooms.filter(function(room) {
    return room.distance(that) < config.room.radius;
  });

  // if we can move forward, then update our location
  if(inRooms.length > 0) {
    this.x = that.x;
    this.y = that.y;

    this.updateRooms(inRooms);
  }
};