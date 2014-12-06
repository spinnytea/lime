'use strict';

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
    socket.on('command', function(str) {
      // TODO create an actuator impl for each action
      // TODO one for discrete; one for continuous
      socket.emit('action', str);
    });

    socket.on('sense', function(state) {
      // TODO find rooms in context: update
      context.senseAgent(state);
    });
  });
};