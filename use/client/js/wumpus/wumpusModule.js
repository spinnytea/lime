'use strict';
var angular = require('angular');

module.exports = angular.module('lime.client.wumpus', [
  require('./controllers/app').name,
  require('./controllers/newgame').name,
]);
