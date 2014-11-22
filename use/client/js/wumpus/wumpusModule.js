'use strict';
module.exports = angular.module('lime.client.wumpus', [
  require('./controllers/app').name,
  require('./services/room').name,
  require('./services/Agent').name,
]);
