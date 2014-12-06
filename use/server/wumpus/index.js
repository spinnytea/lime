'use strict';

var blueprint = require('../../../src/core/planning/primitives/blueprint');
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
      var list = blueprint.list([context.idea('action_'+str), context.idea('wumpus_world')]);
      list = list.map(blueprint.load);
      // build a state // TODO this should be in context (probably instead of subgraph)
      var bs = new blueprint.State(context.subgraph, list);

      // find the first action that works and do it
      var success = list.some(function(a) {
        var result = a.tryTransition(bs);
        if(result.length > 0) {
          a.runBlueprint(bs, result[0]);
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

    socket.on('sense', function(state) {
      // TODO find rooms in context: update
      context.senseAgent(state);
    });
  });
};