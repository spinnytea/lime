'use strict';
var io = require('socket.io-client');

var config = require('./impl/config');
var game = require('./impl/game');

var socket;
var $scope;
var listenerNames = [];
function disconnect() {
  if(socket) {
    console.log('disconnect');
    listenerNames.forEach(function(event) {
      // Note: socket.removeAllListeners(event) didn't work
      socket.listeners(event).forEach(function(callback) {
        socket.removeListener(event, callback);
      });
    });
    listenerNames.splice(0);
    socket.disconnect();
  }
  socket = undefined;
}
exports.connect = function(scope, protocol, host) {
  disconnect();
  $scope = scope;
  socket = io(protocol + '://' + host + ':3000/wumpus').connect();
  console.log('connect');
  socket.emit('config', angular.extend({}, config, {
    chance: undefined, grain: undefined, timing: undefined, multi: undefined,
  }));

  exports.on('action', function(which) {
    var keyCode;

    switch(which) {
      case 'left': keyCode = 37; break;
      case 'up': keyCode = 38; break;
      case 'right': keyCode = 39; break;
      case 'down': keyCode = 40; break;
      case 'noop': keyCode = 32; break;
      case 'grab': keyCode = 71; break;
      case 'exit': keyCode = 69; break;
      case 'fire': keyCode = 70; break;
      default: console.log('invalid action: ' + which);
    }

    if(keyCode) {
      game.keydown({ keyCode: keyCode, preventDefault: angular.noop });
      if(config.game.timing === 'static')
        exports.sense();
    }
  });

  return disconnect;
};

exports.emit = function(event, message) {
  socket.emit(event, message);
};
exports.on = function(event, callback) {
  listenerNames.push(event);
  socket.on(event, function(data) {
    $scope.$apply(function() { callback(data); });
  });
};

exports.sense = function() {
  var cave = angular.extend({}, game.cave);
  if(config.game.observable === 'partially') {
    cave.rooms = [];
    Array.prototype.push.apply(cave.rooms, cave.agent.inRooms);
    cave.agent.inRooms.forEach(function(room) {
      Array.prototype.push.apply(cave.rooms, room.nearbyRooms);
    });
  }
  cave.rooms.forEach(function(room) { room.senses = room.sense(); });
  socket.emit('sense', cave);
};