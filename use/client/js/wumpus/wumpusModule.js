'use strict';

// XXX I am managing the data AAALLLLLL wrong
//  - In many cases, I am writing this under the impression that there "might be multiple instances"
//  - In other cases, I am writing this assuming there will only be one.

var config = require('./impl/config');
var game = require('./impl/game');
var grain = require('./impl/peas/grain');

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
      grain.newgame();
      setTimeout(function() {
        $scope.$apply(function() {
          game.generate();
          $scope.state = 'instance';
        });
      }, 0);
    };
    $scope.generateGame();
  }
]) // end lime.client.wumpus.app controller
.directive('wumpusInstance', [
  function() {
    return {
      templateUrl: 'partials/wumpus/instance.html',
      link: function($scope, elem) {
        $scope.agent = game.cave.agent;
        $scope.rooms = game.cave.rooms;

        elem.css('width', game.cave.bounds.maxx-game.cave.bounds.minx);
        elem.css('height', game.cave.bounds.maxy-game.cave.bounds.miny);

        // TODO watch for player death
        // TODO watch for player win

        $scope.$on('$destroy', $scope.$watch('config.game.grain', function(newValue) {
          $scope.override.keyup = grain.keyup[newValue];
          $scope.override.keydown = grain.keydown[newValue];
        }));
        $scope.$on('$destroy', function() {
          $scope.override.keyup = angular.noop;
          $scope.override.keydown = angular.noop;
        });

        function dynamicUpdate() {
          $scope.$apply(game.update);
          dynamicTimeout = setTimeout(dynamicUpdate, config.timing.updateDelay);
        }
        if(config.game.timing === 'dynamic') {
          var dynamicTimeout;
          $scope.$on('$destroy', function() { clearTimeout(dynamicTimeout); });

          // we need to wait for the digest cycle to end
          setTimeout(dynamicUpdate, 0);
        }
      } // end link
    };
  }
]) // end wumpusInstance directive
.directive('wumpusRoom', [
  function() {
    return {
      scope: {
        room: '=wumpusRoom',
      },
      link: function($scope, elem) {
        // static config
        elem.css('width', config.room.diameter)
          .css('height', config.room.diameter)
          .css('padding-top', config.room.radius/3)
          .css('padding-left', config.room.radius/3)
          .css('border-radius', config.room.radius)
          .css('left', $scope.room.x - game.cave.bounds.minx - config.room.radius)
          .css('top', $scope.room.y - game.cave.bounds.miny - config.room.radius);

        $scope.$on('$destroy', $scope.$watch(function() { return $scope.room.senses(); }, updateHtml, true));

        // TEST cannot deep watch on rooms; we need another way to identify that the rooms have changed
        if(game.cave.wumpus)
          $scope.$on('$destroy', $scope.$watch(function() { return game.cave.wumpus.inRooms; }, updateHtml));
        $scope.$on('$destroy', $scope.$watch(function() { return game.cave.agent.inRooms; }, updateHtml));

        function updateHtml() {
          var senses = $scope.room.senses();
          var hasAgent = (game.cave.agent.inRooms.indexOf($scope.room) !== -1);
          var html =
            addText('Exit', 'black', $scope.room.hasExit) +
            addText(['Gold', 'glitter'], 'gold', [$scope.room.hasGold, senses.glitter]) +
            addText(['Pit', 'breeze'], 'blue', [$scope.room.hasPit, senses.breeze]) +
            addText('Agent', 'black', hasAgent) +
            '';
          if(game.cave.wumpus) {
            var hasWumpus = (game.cave.wumpus.inRooms.indexOf($scope.room) !== -1);
            html += addText(['Wumpus', 'stench', 'breathing'], 'brown', [hasWumpus, senses.stench, senses.breathing]);
          }
          elem.html(html);
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
          elem.css('left', $scope.agent.x - game.cave.bounds.minx - config.agent.radius);
        }));
        $scope.$on('$destroy', $scope.$watch('agent.y', function() {
          elem.css('top', $scope.agent.y - game.cave.bounds.miny - config.agent.radius);
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
