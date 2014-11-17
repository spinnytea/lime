'use strict';
var angular = require('angular');

module.exports = 'lime.client.wumpus';
var wumpus = angular.module('lime.client.wumpus', []);

wumpus.controller('lime.client.wumpus.container', [
  '$scope',
  function($scope) {
    $scope.name = 'example';
  }
]);