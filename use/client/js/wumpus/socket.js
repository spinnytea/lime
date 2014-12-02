'use strict';
var io = require('socket.io-client');

var socket;
function disconnect() {
  if(socket) socket.disconnect();
  socket = undefined;
}
exports.connect = function(protocol, host) {
    disconnect();
    socket = io(protocol + '://' + host + ':3000/wumpus'); // TODO config port

    socket.on('news', function(data) {
      console.log('news');
      console.log(data);
    });

    return disconnect;
};
