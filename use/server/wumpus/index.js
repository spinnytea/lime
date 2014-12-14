'use strict';

//var astar = require('../../../src/core/planning/algorithms/astar');
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var links = require('../../../src/core/database/links');
var subgraph = require('../../../src/core/database/subgraph');

var context = require('./context');

exports.setup = function(io) {
  io.on('connection', function(socket) {
    // Note: only meant for one client
    socket.on('config', function(config) {
      context.setup(socket, config);
    });
    socket.on('disconnect', context.cleanup);

    // super debug
    // this is a round-trip
    // we are sending a command to the server, and sending that command right back
    // --
    // later, lemon will send these command itself
    socket.on('command', function(str) { socket.emit('action', str); socket.emit('message', 'echo'); });

    socket.on('actuator', function(str) {
      // find the list of actions for this str
      if(!context.keys['action_'+str]) {
        socket.emit('message', 'actuator:'+str+'> not found');
        return;
      }

      // load the actions
      var list = blueprint.list([context.idea('action_'+str), context.idea('wumpus_world')]).map(blueprint.load);
      // build a state // TODO this should be in context (probably instead of subgraph)
      var bs = new blueprint.State(context.subgraph, list);

      // find the first action that works and do it
      var success = list.some(function(a) {
        var result = a.tryTransition(bs);
        if(result.length > 0) {
          a.runBlueprint(bs, result[0]);
          if(result.length > 1)
            console.log('more than one option?? ('+result.length+')');
          return true;
        }
        return false;
      });

      if(success) {
        socket.emit('message', 'actuator:'+str+'> potassium');
      } else {
        // if none of the actions work, report a message
        socket.emit('message', 'actuator:'+str+'> could not apply');
      }
    });

    socket.on('goal', function(str) {
      // all plans are going to involve an agent
      var goal = new subgraph.Subgraph();
      var agentInstance = goal.addVertex(subgraph.matcher.filler);
      goal.addEdge(
        goal.addVertex(subgraph.matcher.id, context.idea('instance')),
        links.list.thought_description,
        agentInstance);
       goal.addEdge(agentInstance, links.list.type_of,
        goal.addVertex(subgraph.matcher.id, context.idea('agent')));

      if(str.indexOf('room') === 0) {
        // the agent needs to be in the location we provide
        var roomId = +str.substring(str.indexOf(' ')+1);

        var agentLocation = goal.addVertex(subgraph.matcher.discrete, {value: roomId, unit: context.idea('roomDefinition').id}, {transitionable:true});
        goal.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation);
      }

//      var list = blueprint.list([context.idea('action_up'), context.idea('wumpus_world')]).map(blueprint.load);
//      var start = new blueprint.State(context.subgraph, list);
//      goal = new blueprint.State(goal, list);


//      console.log(astar.search(start, goal));
    });

    socket.on('sense', context.sense);
  });
};