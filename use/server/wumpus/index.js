'use strict';

exports.setup = function(io) {
  io.on('connection', function(socket) {
    console.log('connected!');
    socket.on('disconnect', function() {
      console.log('disconnected!');
    });

    // super debug
    // this is a round-trip
    // we are sending a command to the server, and sending that command right back
    // --
    // later, lemon will send these command itself
    socket.on('command', function(str) {
      socket.emit('action', str);
    });

    socket.on('config', function(config) {
      console.log(config);
    });
    socket.on('sense', function(state) {
      console.log(state);
    });
  });
};