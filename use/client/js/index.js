'use strict';
// TODO shim angular to be loaded externally
var angular = require('angular');
require('angular-route');

var myModule = angular.module('lime.client', [
  require('./wumpus/module'),
  'ngRoute',
]);

myModule.config([
  '$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/wumpus', {
      templateUrl: 'partials/wumpus/container.html',
    });
  }
]);
