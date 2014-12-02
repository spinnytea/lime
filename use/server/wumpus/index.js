'use strict';

exports.setup = function(io) {
  io.on('connection', function(socket) {
    console.log('connected!');
    socket.emit('news', { hello: 'world!' });
    socket.on('disconnect', function() {
      console.log('disconnected!');
    });
  });
};