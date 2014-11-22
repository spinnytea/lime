'use strict';
module.exports = angular.module('lime.client.wumpus', [])
.controller('lime.client.wumpus.app', [
  '$scope',
  function($scope) {
    $scope.name = 'example';

    $scope.gameConfig = {
      chance: 'deterministic',
      grain: 'discrete',
      observable: 'fully',
      timing: 'static',
      roomCount: 4,
    };

    $scope.generateGame = function() {
    };
  }
])
;
