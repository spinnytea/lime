'use strict';
var io = require('socket.io-client');

var game = require('./impl/game');

var socket;
function disconnect() {
  if(socket) socket.disconnect();
  socket = undefined;
}
exports.connect = function($scope, protocol, host) {
    disconnect();
    socket = io(protocol + '://' + host + ':3000/wumpus'); // TODO config port

    socket.on('action', function(which) {
      var keyCode;
      function doIt() {
        game.keydown({ keyCode: keyCode, preventDefault: angular.noop });
      }

      switch(which) {
        case 'left': keyCode = 37; break;
        case 'up': keyCode = 38; break;
        case 'right': keyCode = 39; break;
        case 'down': keyCode = 40; break;
        case 'noop': keyCode = 32; break;
        case 'grab': keyCode = 71; break;
        case 'exit': keyCode = 69; break;
        case 'fire': keyCode = 70; break;
        default:
          console.log('invalid action: ' + which);
      }

      if(keyCode) $scope.$apply(doIt);
    });

    return disconnect;
};

exports.emit = function(event, message) {
  socket.emit(event, message);
};
