'use strict';

// XXX I am managing the data AAALLLLLL wrong
//  - In many cases, I am writing this under the impression that there "might be multiple instances"
//  - In other cases, I am writing this assuming there will only be one.

var config = require('./impl/config');
var game = require('./impl/game');

module.exports = angular.module('lime.client.wumpus', [])
.controller('lime.client.wumpus.app', [
  '$scope',
  function($scope) {
    $scope.config = config;
    $scope.state = 'config';

    $scope.gotoConfig = function() {
      $scope.state = 'config';
      game.cave = undefined;
    };
    $scope.generateGame = function() {
      // our game is in a directive
      // this will basically reset the game
      $scope.state = 'none';
      setTimeout(function() {
        $scope.$apply(function() {
          game.generate();
          $scope.state = 'instance';
        });
      }, 0);
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
        $scope.agent = game.cave.agent;

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

        // TODO when the computer plays, render the unobservable rooms in mute
        if(config.game.observable === 'partially')
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
          .css('border-radius', config.room.radius)
        // room config
          .css('left', $scope.room.x - $scope.bounds.minx - config.room.radius)
          .css('top', $scope.room.y - $scope.bounds.miny - config.room.radius);


        $scope.$on('$destroy', $scope.$watch(function() { return $scope.room.senses(); }, updateHtml, true));

        // TEST cannot deep watch on rooms; we need another way to identify that the rooms have changed
//        $scope.$on('$destroy', $scope.$watch(function() { return game.cave.wumpus.inRooms; }, updateHtml));
//        $scope.$on('$destroy', $scope.$watch(function() { return game.cave.agent.inRooms; }, updateHtml));

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
.directive('wumpusAgent', [
  function() {
    return {
      scope: {
        agent: '=wumpusAgent',
        bounds: '=',
      },
      template: '<span></span>',
      link: function($scope, elem) {
        // static config
        elem.css('width', config.agent.diameter)
          .css('height', config.agent.diameter)
          .css('border-radius', config.agent.radius);

        // the line that indicates direction
        var $dir = elem.find('span');
        $dir.css('width', config.agent.radius-1).css('height', 0);

        // agent config
        $scope.$on('$destroy', $scope.$watch('agent.x', function() {
          elem.css('left', $scope.agent.x - $scope.bounds.minx - config.agent.radius);
        }));
        $scope.$on('$destroy', $scope.$watch('agent.y', function() {
          elem.css('top', $scope.agent.y - $scope.bounds.miny - config.agent.radius);
        }));

        $scope.$on('$destroy', $scope.$watch('agent.r', function() {
          // the rotation turns the middle of the object
          // implemented as a special case: width === radius, height === 0
          var r = $scope.agent.r;
          var left = config.agent.radius/2 + Math.cos(r)*config.agent.radius/2;
          var top = config.agent.radius + Math.sin(r)*config.agent.radius/2;

          $dir.css('transform', 'rotate(' + r + 'rad)')
            .css('top', top)
            .css('left', left);
        }));

      }, // end link
    };
  }
]) // end wumpusRoom directive
;
