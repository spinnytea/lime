'use strict';

// XXX I am managing the data AAALLLLLL wrong
//  - In many cases, I am writing this under the impression that there "might be multiple instances"
//  - In other cases, I am writing this assuming there will only be one.

var config = require('./impl/config');
var game = require('./impl/game');

// XXX make the options enumerated lists that we get from the impls?
var gameConfig = {
  chance: 'deterministic',
  grain: 'discrete',
  observable: 'fully',
  timing: 'static',
  apriori: 'known',
  roomCount: 10,
};

module.exports = angular.module('lime.client.wumpus', [])
.controller('lime.client.wumpus.app', [
  '$scope',
  function($scope) {
    $scope.config = config;
    $scope.state = 'newgame';
    $scope.gameConfig = gameConfig;

    $scope.newGame = function() {
      $scope.state = 'newgame';
      game.cave = undefined;
    };
    $scope.generateGame = function() {
      game.generate(gameConfig);
      $scope.state = 'instance';
    };
  }
]) // end lime.client.wumpus.app controller
.directive('wumpusInstance', [
  function() {
    return {
      templateUrl: 'partials/wumpus/instance.html',
      link: function($scope, elem) {
        $scope.bounds = {
          minx: 0, maxx: 0,
          miny: 0, maxy: 0,
        };

        // find the bounds of the game
        // TODO change bounds with observability
        game.cave.rooms.forEach(function(room) {
          $scope.bounds.minx = Math.min($scope.bounds.minx, room.x);
          $scope.bounds.maxx = Math.max($scope.bounds.maxx, room.x);
          $scope.bounds.miny = Math.min($scope.bounds.miny, room.y);
          $scope.bounds.maxy = Math.max($scope.bounds.maxy, room.y);
        });
        $scope.bounds.minx -= config.room.radius;
        $scope.bounds.maxx += config.room.radius;
        $scope.bounds.miny -= config.room.radius;
        $scope.bounds.maxy += config.room.radius;

        elem.css('width', $scope.bounds.maxx-$scope.bounds.minx);
        elem.css('height', $scope.bounds.maxy-$scope.bounds.miny);

        if(gameConfig.observable === 'partially')
          $scope.rooms = game.cave.agent.inRooms;
        else
          $scope.rooms = game.cave.rooms;
      } // end link
    };
  }
]) // end wumpusInstance directive
.directive('wumpusRoom', [
  function() {
    return {
      scope: {
        room: '=wumpusRoom',
        bounds: '=',
      },
      link: function($scope, elem) {
        // static config
        elem.css('width', config.room.diameter)
          .css('height', config.room.diameter)
          .css('padding-top', config.room.radius/3)
          .css('padding-left', config.room.radius/3)
          .css('border-radius', config.room.radius);

        // room config
        elem.css('left', $scope.room.x - $scope.bounds.minx - config.room.radius)
          .css('top', $scope.room.y - $scope.bounds.miny - config.room.radius);


        $scope.$on('$destroy', $scope.$watch(function() { return $scope.room.senses(); }, updateHtml, true));
        $scope.$on('$destroy', $scope.$watch(function() { return game.cave.wumpus.inRooms; }, updateHtml));
        $scope.$on('$destroy', $scope.$watch(function() { return game.cave.agent.inRooms; }, updateHtml));

        function updateHtml() {
          var senses = $scope.room.senses();
          var hasWumpus = (game.cave.wumpus.inRooms.indexOf($scope.room) !== -1);
          var hasAgent = (game.cave.agent.inRooms.indexOf($scope.room) !== -1);
          elem.html(
            addText('Exit', 'black', $scope.room.hasExit) +
            addText(['Gold', 'glitter'], 'gold', [$scope.room.hasGold, senses.glitter]) +
            addText(['Pit', 'breeze'], 'blue', [$scope.room.hasPit, senses.breeze]) +
            addText(['Wumpus', 'stench', 'breathing'], 'brown', [hasWumpus, senses.stench, senses.breathing]) +
            addText('Agent', 'black', hasAgent) +
            ''
          );
        }

        function addText(strs, color, bools) {
          if(!bools.length) {
            // single case
            return '<div style="color:'+color+';">' +
              (bools?strs:'&nbsp;') +
              '</div>';
          } else {
            // list case
            var idx = bools.indexOf(true);
            if(idx === -1)
              return addText('', color, false);
            else
              return addText(strs[idx], color, true);
          }
        }
      } // end link
    };
  }
]) // end wumpusRoom directive
;
