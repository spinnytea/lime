'use strict';

exports.setup = function(io) {
  io.on('connection', function(socket) {
    console.log('connected!');
    socket.on('disconnect', function() {
      console.log('disconnected!');
    });

    socket.on('command', function(str) {
      console.log(str);
    });
  });
};