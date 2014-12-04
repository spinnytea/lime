'use strict';

exports.setup = function(io) {
  io.on('connection', function(socket) {
    // TODO setup context
    console.log('connected!');
    socket.on('disconnect', function() {
      // TODO tear down context
      console.log('disconnected!');
    });

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

    socket.on('config', function(config) {
      console.log(config);
      // TODO put config data in context
    });
    socket.on('sense', function() {
//      console.log(state);
      // TODO find agent in context: update
      // TODO find rooms in context: update
    });
  });
};