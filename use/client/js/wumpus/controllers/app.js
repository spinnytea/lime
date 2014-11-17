'use strict';
var angular = require('angular');

module.exports = angular.module('lime.client.wumpus.app', []);
module.exports.controller('lime.client.wumpus.app', [
  '$scope',
  function($scope) {
    $scope.name = 'example';
  }
]);
