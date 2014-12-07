'use strict';
var _ = require('lodash');

var actuator = require('../../../src/core/planning/actuator');
var config = require('../../../config');
var discrete = require('../../../src/core/planning/primitives/discrete');
var ideas = require('../../../src/core/database/ideas');
var links = require('../../../src/core/database/links');
var subgraph = require('../../../src/core/database/subgraph');


// create the actions that we can use
['left', 'right'].forEach(function(a) {
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
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.thought_description, exports.keys.action_left);
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.thought_description, exports.keys.action_right);

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
    wumpus_world.link(links.list.thought_description, action_left);
    wumpus_world.link(links.list.thought_description, action_right);

    // directions
    var directions = discrete.definitions.create(['east', 'south', 'west', 'north']);
    var compass = ideas.create({name:'compass'});
    wumpus_world.link(links.list.context, directions);
    directions.link(links.list.thought_description, compass);

    // agent type
    var agent = ideas.create({name:'agent'});
    wumpus_world.link(links.list.context, agent);
    // room type
    var room = ideas.create({name:'room'});
    wumpus_world.link(links.list.context, room);

    // now search again
    results = subgraph.search(exports.subgraph);


    // create left turn (when facing east)
    var a = new actuator.Action();
    var a_agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
    var a_agentDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id}, true);
    a.requirements.addEdge(
      a_agentInstance,
      links.list.type_of,
      a.requirements.addVertex(subgraph.matcher.id, agent)
    );
    a.requirements.addEdge(a_agentInstance, links.list.thought_description, a_agentDirection);
    a.transitions.push({ vertex_id: a_agentDirection, cycle: {value: -1, unit: directions.id} });
    a.action = 'wumpus_known_discrete_left';
    a.save();
    ideas.load(a.idea).link(links.list.context, wumpus_world);
    ideas.load(a.idea).link(links.list.context, action_left);

    // TODO trying some shorthand: just update the action and save it again
    // - this is brittle, but it works for now
    ideas.save(a.idea);
    a.idea = undefined;
    a.transitions[0].cycle.value = 1;
    a.action = 'wumpus_known_discrete_right';
    a.save();
    ideas.load(a.idea).link(links.list.context, wumpus_world);
    ideas.load(a.idea).link(links.list.context, action_right);


    // save our the ideas
    [
      wumpus_world, action_left, action_right,
      directions, compass, agent,
      a.idea,
    ].forEach(ideas.save);
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
    exports.keys.instance = exports.subgraph.addVertex(subgraph.matcher.id, instance);
    instance.link(links.list.type_of, exports.idea('wumpus_world'));


    //
    // rooms
    //

    // TODO create a discrete definition THESE rooms (room id as the value)
    console.log(state.rooms.map(function(r) { return r.id; }));
    // TODO create a "rooms" object (this is ease of use for people)
    // TODO attach the rooms under it (the room's value is the discrete)
    // TODO attach senses under rooms


    //
    // agent
    //
    var agentInstance = ideas.create();
    var agentDirection = ideas.create();
    exports.idea('instance').link(links.list.thought_description, agentInstance);
    agentInstance.link(links.list.type_of, exports.idea('agent'));
    agentInstance.link(links.list.thought_description, agentDirection);
    // TODO agentRoom (current location)

    exports.keys.agentInstance = exports.subgraph.addVertex(subgraph.matcher.filler);
    exports.keys.agentDirection = exports.subgraph.addVertex(subgraph.matcher.filler, undefined, true);
    exports.subgraph.addEdge(exports.keys.instance, links.list.thought_description, exports.keys.agentInstance);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.type_of, exports.keys.agent);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.thought_description, exports.keys.agentDirection);


    config.save();
    subgraph.search(exports.subgraph);
  //  console.log('discrete concrete: ' + exports.subgraph.concrete);
  }

  senseRooms(state.rooms);
  senseAgent(state.agent);
};

function senseRooms(rooms) {
  console.log(rooms[0]);
}

function senseAgent(agent) {
  // note: the -= needs to be second since we are comparing against zero
  var dir;
  while(agent.r < 0) agent.r += Math.PI*2;
  while(agent.r > Math.PI*2) agent.r -= Math.PI*2;
  if(Math.abs(agent.r-0) < 0.001)
    dir = 'east';
  if(Math.abs(agent.r-Math.PI/2) < 0.001)
    dir = 'south';
  if(Math.abs(agent.r-Math.PI) < 0.001)
    dir = 'west';
  if(Math.abs(agent.r-Math.PI*3/2) < 0.001)
    dir = 'north';
  exports.idea('agentDirection').update({value: dir, unit: exports.idea('directions').id});

  // TODO update agent room location
  // agent.inRoomIds[0]

  // TODO log when the sensed value differs from the internal value
  // TODO create a function to reset vertex data cache
  exports.subgraph.vertices[exports.keys.agentDirection].data = undefined;
}