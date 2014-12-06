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
//var instanceIdea;
var context = {
  // the subgraph the represents the context
  subgraph: undefined,
  // name -> subgraph.vertex_id
  keys: {},
};


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
};

exports.cleanup = function() {
  console.log('cleanup');
  gameConfig = undefined;
  socket = undefined;
  config.save();
};


var getDiscreteContext = function() {
  context.subgraph = new subgraph.Subgraph();
  context.keys.wumpus_world = context.subgraph.addVertex(subgraph.matcher.id, ideas.context('wumpus_world'));
  context.keys.directions = context.subgraph.addVertex(subgraph.matcher.similar, discrete.definitions.similar);
  context.subgraph.addEdge(context.keys.wumpus_world, links.list.context, context.keys.directions);
  context.subgraph.addEdge(
    context.keys.directions,
    links.list.context,
    context.subgraph.addVertex(subgraph.matcher.similar, { name: 'compass' })
  );

  var results = subgraph.search(context.subgraph);
  if(results.length === 0) {
    console.log('create discrete context');

    var wumpus_world = ideas.context('wumpus_world');
    var directions = discrete.definitions.create(['east', 'north', 'west', 'south']);
    var compass = ideas.create({name: 'compass'});
    wumpus_world.link(links.list.context, directions);
    directions.link(links.list.context, compass);

    // save our the ideas
    [wumpus_world, directions, compass].forEach(ideas.save);
    config.save();

    // now search again
    results = subgraph.search(context.subgraph);
  }

  if(results.length === 1) {
    // TODO load discrete context
    console.log('loaded discrete context');
  } else {
    console.log('error');
    // what? do I even try to handle this?
  }
};