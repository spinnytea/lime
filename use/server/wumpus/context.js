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
    console.log('I can only handle one thing at a time.');
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
    console.log('I don\'t know how to handle this.');
    return;
  }

  socket = s;
  gameConfig = c;
  getDiscreteContext();
  exports.keys.instance = exports.subgraph.addVertex(subgraph.matcher.id, ideas.create());
  config.save();
  subgraph.search(exports.subgraph);
  // exports.subgraph.concrete === true;
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
  // context
  exports.subgraph = new subgraph.Subgraph();
  exports.keys.wumpus_world = exports.subgraph.addVertex(subgraph.matcher.id, ideas.context('wumpus_world'));

  // directions
  exports.keys.directions = exports.subgraph.addVertex(subgraph.matcher.similar, discrete.definitions.similar);
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.context, exports.keys.directions);
  exports.subgraph.addEdge(
    exports.keys.directions,
    links.list.thought_description,
    exports.subgraph.addVertex(subgraph.matcher.similar, { name: 'compass' })
  );

  // agent type
  exports.keys.agent = exports.subgraph.addVertex(subgraph.matcher.similar, { name: 'agent' });
  exports.subgraph.addEdge(exports.keys.wumpus_world, links.list.context, exports.keys.agent);

  var results = subgraph.search(exports.subgraph);
  if(results.length === 0) {
    console.log('create discrete context');

    // context
    var wumpus_world = ideas.context('wumpus_world');

    // directions
    var directions = discrete.definitions.create(['east', 'north', 'west', 'south']);
    var compass = ideas.create({name: 'compass'});
    wumpus_world.link(links.list.context, directions);
    directions.link(links.list.thought_description, compass);

    // agent type
    var agent = ideas.create({name: 'agent'});
    wumpus_world.link(links.list.context, agent);

    // save our the ideas
    [wumpus_world, directions, compass, agent].forEach(ideas.save);
    config.save();

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

exports.senseAgent = function(state) {
  if(!exports.keys.agentInstance) {
    var agentInstance = ideas.create();
    var agentDirection = ideas.create();
    agentInstance.link(links.list.type_of, exports.idea('agent'));
    agentInstance.link(links.list.thought_description, agentDirection);

    exports.keys.agentInstance = exports.subgraph.addVertex(subgraph.matcher.filler);
    exports.keys.agentDirection = exports.subgraph.addVertex(subgraph.matcher.filler);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.type_of, exports.keys.agent);
    exports.subgraph.addEdge(exports.keys.agentInstance, links.list.thought_description, exports.keys.agentDirection);

    config.save();
    subgraph.search(exports.subgraph);
//    console.log('concrete: ' + exports.subgraph.concrete);
  }

  // note: the -= needs to be second since we are comparing against zero
  var dir;
  while(state.agent.r < 0) state.agent.r += Math.PI*2;
  while(state.agent.r > Math.PI*2) state.agent.r -= Math.PI*2;
  if(Math.abs(state.agent.r-0) < 0.001)
    dir = 'east';
  if(Math.abs(state.agent.r-Math.PI/2) < 0.001)
    dir = 'north';
  if(Math.abs(state.agent.r-Math.PI) < 0.001)
    dir = 'west';
  if(Math.abs(state.agent.r-Math.PI*3/4) < 0.001)
    dir = 'west';
  exports.idea('agentDirection').update({value: dir, unit: exports.idea('directions').id});
};