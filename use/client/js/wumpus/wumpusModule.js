'use strict';

var game = require('./impl/game');

module.exports = angular.module('lime.client.wumpus', [])
.controller('lime.client.wumpus.app', [
  '$scope',
  function($scope) {
    $scope.name = 'example';

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
    };
  }
])
;
