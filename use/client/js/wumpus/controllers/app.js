'use strict';
module.exports = angular.module('lime.client.wumpus.app', []);
module.exports.controller('lime.client.wumpus.app', [
  '$scope',
  function($scope) {
    $scope.name = 'example';

    $scope.gameConfig = {
      chance: 'deterministic',
      grain: 'discrete',
      observable: 'fully',
      timing: 'static',
    };

    $scope.generateGame = function() {
      console.log('generate!');
    };
  }
]);
