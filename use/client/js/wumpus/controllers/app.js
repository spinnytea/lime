'use strict';
module.exports = angular.module('lime.client.wumpus.app', []);
module.exports.controller('lime.client.wumpus.app', [
  '$scope', 'lime.client.wumpus.room',
  function($scope, Room) {
    $scope.name = 'example';

    $scope.gameConfig = {
      chance: 'deterministic',
      grain: 'discrete',
      observable: 'fully',
      timing: 'static',
    };

    $scope.generateGame = function() {
      console.log('generate!');
      console.log(new Room(0, 0, { hasExit: true }));
      console.log(new Room(0, 0).senses());
    };
  }
]);
