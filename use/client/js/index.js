'use strict';
// TODO shim angular to be loaded externally
var angular = require('angular');

angular.module('lime.client', [
  require('./wumpus/module'),
]);
