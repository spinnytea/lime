'use strict';

`var config = require('./impl/config');
var game = require('./impl/game');

module.exports = angular.module('lime.client.wumpus', [])
.controller('lime.client.wumpus.app', [
  '$scope',
  function($scope) {
    $scope.config = config;
    $scope.state = 'newgame';

    // XXX make the options enumerated lists that we get from the impls?
    $scope.gameConfig = {
      chance: 'deterministic',
      grain: 'discrete',
      observable: 'fully',
      timing: 'static',
      roomCount: 4,
    };

    $scope.generateGame = function() {
      game.generate($scope.gameConfig);
      console.log(game.cave);
      $scope.state = 'instance';
    };
  }
])
.directive('wumpusInstance', [
  function() {
    return {
      templateUrl: 'partials/wumpus/instance.html',
      link: function($scope, elem) {
        var minx = 0, maxx = 0, miny = 0, maxy = 0;

        // find the bounds of the game
        game.cave.rooms.forEach(function(room) {
          minx = Math.min(minx, room.x);
          maxx = Math.max(maxx, room.x);
          miny = Math.min(miny, room.y);
          maxy = Math.max(maxy, room.y);
        });
        minx -= config.room.radius;
        maxx += config.room.radius;
        miny -= config.room.radius;
        maxy += config.room.radius;

        elem.css('width', maxx-minx);
        elem.css('height', maxy-miny);

        $scope.rooms = game.cave.rooms;
      },
    };
  }
])
;
