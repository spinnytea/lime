'use strict';
var angular = require('angular');

module.exports = angular.module('lime.client.wumpus.newgame', []);
module.exports.controller('lime.client.wumpus.newgame', [
  '$scope',
  function($scope) {
    $scope.gameConfig = {
      chance: 'deterministic',
      grain: 'discrete',
      observable: 'fully',
      timing: 'static',
    };
  }
]);
