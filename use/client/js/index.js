'use strict';
// TODO shim angular to be loaded externally
angular.module('lime.client', [
  require('./wumpus/wumpusModule').name,
  'ngRoute',
]).config([
  '$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/wumpus', {
      templateUrl: 'partials/wumpus/app.html',
      controller: 'lime.client.wumpus.app',
    });
  }
]).controller('contentController', [
  '$scope', '$location',
  function($scope, $location) {
    // the layout is a little counter-intuitive
    // however, I intend to upgrade the wrapper eventually
    $scope.showMenu = true;
    $scope.$watch(function() { return $location.path(); }, function(newValue) {
      $scope.showMenu = (newValue === '');
    });
  }
]);