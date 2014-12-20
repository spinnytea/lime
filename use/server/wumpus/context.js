'use strict';
var _ = require('lodash');

var actuator = require('../../../src/core/planning/actuator');
var config = require('../../../config');
var discrete = require('../../../src/core/planning/primitives/discrete');
var ideas = require('../../../src/core/database/ideas');
var links = require('../../../src/core/database/links');
var subgraph = require('../../../src/core/database/subgraph');

var discreteActuators = require('./actuators/discreteActuators');

var ERROR_RANGE = 0.001;
links.create('wumpus_sense_agent_dir');
links.create('wumpus_sense_agent_loc');
links.create('wumpus_sense_hasPit');
links.create('wumpus_sense_hasGold');
links.create('wumpus_sense_hasExit');
links.create('wumpus_room_door');
discrete.definitions.difference.wumpus_room = function(d1, d2) {
  // TODO debug astar path expansions without this
  // - what do they look like?
  // - it IS better than not using this at all
  // - why does this still take p60/f100 to get to a room?
  var dx = Math.abs(d1.loc.x-d2.loc.x);
  var dy = Math.abs(d1.loc.y-d2.loc.y);
  if(dx === 0) return dy;
  if(dy === 0) return dx;
  return dx + dy + 1;
};
// these are cached for ease of use in index.js
// we want them to be stored with the idea (alongside the discrete value)
// but there isn't a good way to recover the loc from the roomId
// TODO specify new agent location based on room
// - this is breaking and I wanted to get on with discrete.definitions.difference
exports.roomLoc = {};

// create the actions that we can use
['left', 'right', 'up', 'grab'].forEach(function(a) {
  actuator.actions['wumpus_known_discrete_'+a] = function() { socket.emit('action', a); };
});

var socket;
var gameConfig;

// the subgraph the represents the context
exports.subgraph = undefined;
// name -> subgraph.vertex_id
exports.keys = {};
// name -> idea
// should be same name as used in keys
// convenience mapping from for subgraph.vertices[keys].idea
exports.idea = function(name) { return exports.subgraph.vertices[exports.keys[name]].idea; };


exports.setup = function(s, c) {
  console.log('setup');

  if(socket) {
    s.emit('message', 'I can only handle one thing at a time.');
    return;
  }

  // for now, we only know how to handle the basics
  if(!_.isEqual(c.game, _.merge(_.cloneDeep(c.game), {
    chance: 'deterministic', // stochastic
    grain: 'discrete', // continuous
    observable: 'fully', // partially
    timing: 'static', // dynamic
    agents: 'single', // multi
    player: 'lemon', // person
  }))) {
    s.emit('message', 'I don\'t know how to handle this.');
    return;
  }

  socket = s;
  gameConfig = c;
  getDiscreteContext();
  s.emit('message', 'Connected');
};

exports.cleanup = function() {
  console.log('cleanup');
  gameConfig = undefined;
  socket = undefined;
  exports.subgraph = undefined;
  exports.keys = {};
//  exports.ideas = {};
  config.save();
};


var getDiscreteContext = function() {
  exports.subgraph = new subgraph.Subgraph();

  // context
  exports.keys.wumpus_world = exports.subgraph.addVertex(subgraph.matcher.id, ideas.context('wumpus_world'));
  exports.keys.action_left = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:left'});
  exports.keys.action_right = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:right'});
  exports.keys.action_up = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:up'});
  exports.keys.action_grab = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'action:grab'});
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.thought_description, exports.keys.action_left);
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.thought_description, exports.keys.action_right);
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.thought_description, exports.keys.action_up);
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.thought_description, exports.keys.action_grab);

  // directions
  exports.keys.directions = exports.subgraph.addVertex(subgraph.matcher.similar, discrete.definitions.similar);
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.context, exports.keys.directions);
  exports.subgraph.addEdge(
    exports.keys.directions,
    links.list.thought_description,
    exports.subgraph.addVertex(subgraph.matcher.exact, {name:'compass'})
  );

  // agent type
  exports.keys.agent = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'agent'});
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.context, exports.keys.agent);
  // room type
  exports.keys.room = exports.subgraph.addVertex(subgraph.matcher.exact, {name:'room'});
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.context, exports.keys.room);

  var results = subgraph.search(exports.subgraph);
  if(results.length === 0) {
    console.log('create discrete context');

    // context
    // TODO relink context directions
    var wumpus_world = ideas.context('wumpus_world');
    var action_left = ideas.create({name:'action:left'});
    var action_right = ideas.create({name:'action:right'});
    var action_up = ideas.create({name:'action:up'});
    var action_grab = ideas.create({name:'action:grab'});
    wumpus_world.link(links.list.thought_description, action_left);
    wumpus_world.link(links.list.thought_description, action_right);
    wumpus_world.link(links.list.thought_description, action_up);
    wumpus_world.link(links.list.thought_description, action_grab);

    // directions
    var directions = discrete.definitions.create(['east', 'south', 'west', 'north'], 'cycle');
    var compass = ideas.create({name:'compass'});
    wumpus_world.link(links.list.context, directions);
    directions.link(links.list.thought_description, compass);

    // agent type
    var agent = ideas.create({name:'agent'});
    wumpus_world.link(links.list.context, agent);
    // room type
    var room = ideas.create({name:'room'});
    wumpus_world.link(links.list.context, room);


    // create actuators
    discreteActuators.turn(directions, agent, -1, 'left', [wumpus_world, action_left]);
    discreteActuators.turn(directions, agent, 1, 'right', [wumpus_world, action_right]);
    discreteActuators.forward(directions, agent, room, [wumpus_world, action_up]);
    discreteActuators.grab(agent, room, [wumpus_world, action_grab]);


    // save our the ideas
    [
      wumpus_world, action_left, action_right, action_up, action_grab, ideas.context('blueprint'),
      directions, compass, agent, room,
    ].forEach(ideas.save);
    // now search again
    results = subgraph.search(exports.subgraph);
  }

  // finish loading
  if(results.length === 1) {
    console.log('loaded discrete context');
  } else {
    console.log('error: found ' + results.length + ' discrete contexts');
    exports.subgraph = results[0];
  }
};


exports.sense = function(state) {
  if(!socket) return;
  if(!exports.keys.instance) {
    var instance = ideas.create();
    instance.link(links.list.type_of, exports.idea('wumpus_world'));
    exports.keys.instance = exports.subgraph.addVertex(subgraph.matcher.id, instance);
    exports.subgraph.addEdge(exports.keys.instance, links.list.type_of, exports.keys.wumpus_world);


    //
    // rooms
    //
    // create a discrete definition with these rooms (room id as the value)
    var roomDefinition = discrete.definitions.create(state.rooms.map(function(r) { return r.id; }), 'wumpus_room');
    instance.link(links.list.context, roomDefinition);
    roomDefinition.link(links.list.thought_description, ideas.create({name:'room def'}));
    exports.keys.roomDefinition = exports.subgraph.addVertex(subgraph.matcher.similar, discrete.definitions.similar);
    exports.subgraph.addEdge(exports.keys.instance, links.list.context, exports.keys.roomDefinition);
    exports.subgraph.addEdge(
      exports.keys.roomDefinition,
      links.list.thought_description,
      exports.subgraph.addVertex(subgraph.matcher.exact, {name:'room def'})
    );


    var roomInstances = [];
    var roomKeys = [];
    state.rooms.forEach(function(room) {
      exports.roomLoc[room.id] = { x: room.x, y: room.y };

      var roomInstance = ideas.create(discrete.cast({value: room.id, unit: roomDefinition.id, loc: { x: room.x, y: room.y }}));
      roomDefinition.link(links.list.thought_description, roomInstance);
      roomInstance.link(links.list.type_of, exports.idea('room'));
      var roomHasPit = ideas.create(discrete.cast({value:room.hasPit, unit: discrete.definitions.list.boolean}));
      var roomHasGold = ideas.create(discrete.cast({value:room.hasGold, unit: discrete.definitions.list.boolean}));
      var roomHasExit = ideas.create(discrete.cast({value:room.hasExit, unit: discrete.definitions.list.boolean}));
      roomInstance.link(links.list.wumpus_sense_hasPit, roomHasPit);
      roomInstance.link(links.list.wumpus_sense_hasGold, roomHasGold);
      roomInstance.link(links.list.wumpus_sense_hasExit, roomHasExit);

      var keys_rI = exports.subgraph.addVertex(subgraph.matcher.id, roomInstance);
      exports.subgraph.addEdge(exports.keys.roomDefinition, links.list.thought_description, keys_rI);
      exports.subgraph.addEdge(keys_rI, links.list.type_of, exports.keys.room);
      exports.subgraph.addEdge(keys_rI, links.list.wumpus_sense_hasPit,
        exports.subgraph.addVertex(subgraph.matcher.id, roomHasPit));
      exports.subgraph.addEdge(keys_rI, links.list.wumpus_sense_hasGold,
        exports.subgraph.addVertex(subgraph.matcher.id, roomHasGold));
      exports.subgraph.addEdge(keys_rI, links.list.wumpus_sense_hasExit,
        exports.subgraph.addVertex(subgraph.matcher.id, roomHasExit));

      // link rooms together (check existing rooms)
      // this is similar to for(j=0; j<length) for(i=j+1; j<length)
      for(var i=0; i<roomInstances.length; i++) {
        var r2 = state.rooms[i];
        var south, north;
        var east, west;
        if(Math.abs(room.x-r2.x) < ERROR_RANGE) {
          // check north / south
          if(Math.abs(room.y-r2.y - gameConfig.room.spacing) < ERROR_RANGE) {
            // room > r2
            // room is south of r2
            // if the agent is in r2 and goes south, then the agent is in room
            south = ideas.create(discrete.cast({value: 'south', unit: exports.idea('directions').id }));
            north = ideas.create(discrete.cast({value: 'north', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list.wumpus_room_door, south);
            south.link(links.list.wumpus_room_door, roomInstance);
            roomInstance.link(links.list.wumpus_room_door, north);
            north.link(links.list.wumpus_room_door, roomInstances[i]);

            south = exports.subgraph.addVertex(subgraph.matcher.id, south);
            north = exports.subgraph.addVertex(subgraph.matcher.id, north);
            exports.subgraph.addEdge(roomKeys[i], links.list.wumpus_room_door, south);
            exports.subgraph.addEdge(south, links.list.wumpus_room_door, keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list.wumpus_room_door, north);
            exports.subgraph.addEdge(north, links.list.wumpus_room_door, roomKeys[i]);
          }
          if(Math.abs(r2.y-room.y - gameConfig.room.spacing) < ERROR_RANGE) {
            // r2 > room
            // r2 is south of room
            // if the agent is in room and goes south, then the agent is in r2
            north = ideas.create(discrete.cast({value: 'north', unit: exports.idea('directions').id }));
            south = ideas.create(discrete.cast({value: 'south', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list.wumpus_room_door, north);
            north.link(links.list.wumpus_room_door, roomInstance);
            roomInstance.link(links.list.wumpus_room_door, south);
            south.link(links.list.wumpus_room_door, roomInstances[i]);

            north = exports.subgraph.addVertex(subgraph.matcher.id, north);
            south = exports.subgraph.addVertex(subgraph.matcher.id, south);
            exports.subgraph.addEdge(roomKeys[i], links.list.wumpus_room_door, north);
            exports.subgraph.addEdge(north, links.list.wumpus_room_door, keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list.wumpus_room_door, south);
            exports.subgraph.addEdge(south, links.list.wumpus_room_door, roomKeys[i]);
          }
        } else if(Math.abs(room.y-r2.y) < ERROR_RANGE) {
          // check east/west
          if(Math.abs(room.x-r2.x - gameConfig.room.spacing) < ERROR_RANGE) {
            // room > r2
            // room is east of r2
            // if the agent is in r2 and goes east, then the agent is in room
            east = ideas.create(discrete.cast({value: 'east', unit: exports.idea('directions').id }));
            west = ideas.create(discrete.cast({value: 'west', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list.wumpus_room_door, east);
            east.link(links.list.wumpus_room_door, roomInstance);
            roomInstance.link(links.list.wumpus_room_door, west);
            west.link(links.list.wumpus_room_door, roomInstances[i]);

            east = exports.subgraph.addVertex(subgraph.matcher.id, east);
            west = exports.subgraph.addVertex(subgraph.matcher.id, west);
            exports.subgraph.addEdge(roomKeys[i], links.list.wumpus_room_door, east);
            exports.subgraph.addEdge(east, links.list.wumpus_room_door, keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list.wumpus_room_door, west);
            exports.subgraph.addEdge(west, links.list.wumpus_room_door, roomKeys[i]);
          }
          if(Math.abs(r2.x-room.x - gameConfig.room.spacing) < ERROR_RANGE) {
            // r2 > room
            // r2 is east of room
            // if the agent is in room and goes east, then the agent is in r2
            west = ideas.create(discrete.cast({value: 'west', unit: exports.idea('directions').id }));
            east = ideas.create(discrete.cast({value: 'east', unit: exports.idea('directions').id }));
            roomInstances[i].link(links.list.wumpus_room_door, west);
            west.link(links.list.wumpus_room_door, roomInstance);
            roomInstance.link(links.list.wumpus_room_door, east);
            east.link(links.list.wumpus_room_door, roomInstances[i]);

            west = exports.subgraph.addVertex(subgraph.matcher.id, west);
            east = exports.subgraph.addVertex(subgraph.matcher.id, east);
            exports.subgraph.addEdge(roomKeys[i], links.list.wumpus_room_door, west);
            exports.subgraph.addEdge(west, links.list.wumpus_room_door, keys_rI);
            exports.subgraph.addEdge(keys_rI, links.list.wumpus_room_door, east);
            exports.subgraph.addEdge(east, links.list.wumpus_room_door, roomKeys[i]);
          }
        }
      }

      roomInstances.push(roomInstance);
      roomKeys.push(keys_rI);
    }); // end rooms.forEach


    //
    // agent
    //
    var agentInstance = ideas.create();
    var agentDirection = ideas.create();
    var agentLocation = ideas.create();
    var agentHasGold = ideas.create();
    instance.link(links.list.thought_description, agentInstance);
    agentInstance.link(links.list.type_of, exports.idea('agent'));
    agentInstance.link(links.list.wumpus_sense_agent_dir, agentDirection);
    agentInstance.link(links.list.wumpus_sense_agent_loc, agentLocation);
    agentInstance.link(links.list.wumpus_sense_hasGold, agentHasGold);

    exports.keys.agentInstance = exports.subgraph.addVertex(subgraph.matcher.filler);
    exports.keys.agentDirection = exports.subgraph.addVertex(subgraph.matcher.id, agentDirection, {transitionable:true});
    exports.keys.agentLocation = exports.subgraph.addVertex(subgraph.matcher.id, agentLocation, {transitionable:true});
    exports.keys.agentHasGold = exports.subgraph.addVertex(subgraph.matcher.id, agentHasGold, {transitionable:true});
    exports.subgraph.addEdge(exports.keys.instance, links.list.thought_description, exports.keys.agentInstance);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.type_of, exports.keys.agent);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.wumpus_sense_agent_dir, exports.keys.agentDirection);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.wumpus_sense_agent_loc, exports.keys.agentLocation);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.wumpus_sense_hasGold, exports.keys.agentHasGold);


    config.save();
    subgraph.search(exports.subgraph);
  //  console.log('discrete concrete: ' + exports.subgraph.concrete);
  }

  senseRooms(state.rooms);
  senseAgent(state.agent);
};

function senseRooms() {
//  console.log(rooms[0]);
}

function senseAgent(agent) {
  // TODO log when the sensed value differs from the internal value

  // update agent direction
  // note: the -= needs to be second since we are comparing against zero
  var dir;
  while(agent.r < 0) agent.r += Math.PI*2;
  while(agent.r > Math.PI*2) agent.r -= Math.PI*2;
  if(Math.abs(agent.r-0) < ERROR_RANGE)
    dir = 'east';
  if(Math.abs(agent.r-Math.PI/2) < ERROR_RANGE)
    dir = 'south';
  if(Math.abs(agent.r-Math.PI) < ERROR_RANGE)
    dir = 'west';
  if(Math.abs(agent.r-Math.PI*3/2) < ERROR_RANGE)
    dir = 'north';
  exports.idea('agentDirection').update(discrete.cast({value: dir, unit: exports.idea('directions').id}));

  // update agent location
  exports.idea('agentLocation').update(discrete.cast({value: agent.inRoomIds[0], unit: exports.idea('roomDefinition').id, loc: { x: agent.x, y: agent.y }}));

  // update agent hasGold
  exports.idea('agentHasGold').update(discrete.cast({value: agent.hasGold, unit: discrete.definitions.list.boolean}));

  // TODO create a function to reset vertex data cache
  exports.subgraph.vertices[exports.keys.agentDirection].data = undefined;
  exports.subgraph.vertices[exports.keys.agentLocation].data = undefined;
  exports.subgraph.vertices[exports.keys.agentHasGold].data = undefined;
}