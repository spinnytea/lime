'use strict';

var config = require('./impl/config');
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
      $scope.state = 'instance';
    };
  }
])
.directive('wumpusInstance', [
  function() {
    return {
      template: 'partials/wumpus/instance.html',
      link: function($scope, elem) {
        $scope.bounds = {
          minx: 0, maxx: 0,
          miny: 0, maxy: 0,
        };

        // find the bounds of the game
        game.cave.rooms.forEach(function(room) {
          $scope.bounds.minx = Math.min($scope.bounds.minx, room.x);
          $scope.bounds.maxx = Math.max($scope.bounds.maxx, room.x);
          $scope.bounds.miny = Math.min($scope.bounds.miny, room.y);
          $scope.bounds.maxy = Math.max($scope.bounds.maxy, room.y);
        });
        $scope.bounds.minx -= config.room.radius;
        $scope.bounds.maxx += config.room.radius;
        $scope.bounds.miny -= config.room.radius;
        $scope.bounds.maxy += config.room.radius;

        elem.css('width', $scope.bounds.maxx-$scope.bounds.minx);
        elem.css('height', $scope.bounds.maxy-$scope.bounds.miny);

        $scope.rooms = game.cave.rooms;
      },
    };
  }
])
.directive('wumpusRoom', [
  function() {
    return {
      scope: {
        room: '=wumpusRoom',
        bounds: '=',
      },
      link: function($scope, elem) {
        // static config
        elem.css('width', config.room.diameter)
          .css('height', config.room.diameter)
          .css('border-radius', config.room.radius);

        // room config
        elem.css('left', $scope.room.x - $scope.bounds.minx - config.room.radius)
          .css('top', $scope.room.y - $scope.bounds.miny - config.room.radius);
      }
    };
  }
])
;
