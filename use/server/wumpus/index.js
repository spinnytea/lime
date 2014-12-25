'use strict';

var blueprint = require('../../../src/core/planning/primitives/blueprint');
var links = require('../../../src/core/database/links');
var serialplan = require('../../../src/core/planning/serialplan');
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
    socket.on('context', function() { socket.emit('context', subgraph.stringify(context.subgraph, true)); });

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
      var roomDefinition = goal.addVertex(subgraph.matcher.id, context.idea('roomDefinition'));

      if(str.indexOf('room') === 0) {
        // TODO sometimes we go to the wrong room
        // the agent needs to be in the location we provide
        var roomId = +str.substring(str.indexOf(' ')+1);
        var loc = context.roomLoc[roomId];

        // TODO specify new agent location based on room
        var roomInstance = goal.addVertex(subgraph.matcher.discrete, { value: roomId, unit: context.idea('roomDefinition').id, loc: loc });
        goal.addEdge(roomDefinition, links.list.thought_description, roomInstance);
//        var agentLocation = goal.addVertex(subgraph.matcher.discrete, roomInstance, {transitionable:true,matchRef:true});
        var agentLocation = goal.addVertex(subgraph.matcher.discrete, { value: roomId, unit: context.idea('roomDefinition').id, loc: loc }, {transitionable:true});
        goal.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation);
      } else {
        socket.emit('message', 'goal:'+str+'> not a valid goal');
        return;
      }

      var list = blueprint.list([context.idea('wumpus_world')]).map(blueprint.load);
      var start = new blueprint.State(context.subgraph, list);
      goal = new blueprint.State(goal, list);

      // TODO save serial plan
      // - let me run it from the UI
      // - make a delay
      // TODO discrete difference of 1 not enough
      // - figure out how to do manhattan difference
      var sp = serialplan.create(start, goal);

      if(sp) {
        if(sp.plans && sp.plans.length === 0) {
          // TODO how can I determine this without going into sp?
          // - should serialplan.create return undefined
          //   - probably not
          // - should there be a special "noop" plan?
          //   - :/ no op implies wait; not that we have already succeeded
          // - should there be a special "do nothing" plan?
          // - or maybe we should be matching against the goal first to know there is nothing to do
          //   - if(subgraph.match(start, goal)) /* skip the search */;
          socket.emit('message', 'goal:'+str+'> here\'s the plan: do nothing');
          return;
        }

        var result = sp.tryTransition(start);
        if(result.length > 0) {
          sp.runBlueprint(start, result[0]);
          if(result.length > 1)
            console.log('more than one result?? ('+result.length+')');
          socket.emit('message', 'goal:'+str+'> oxygen potassium');
        } else {
          socket.emit('message', 'goal:'+str+'> could not apply the path ...?');
        }
      } else {
        socket.emit('message', 'goal:'+str+'> could not find a path');
      }
    });

    socket.on('sense', context.sense);
  });
};