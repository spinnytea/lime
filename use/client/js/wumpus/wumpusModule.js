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
    $scope.generateGame();
  }
]) // end lime.client.wumpus.app controller
.directive('wumpusInstance', [
  function() {
    return {
      templateUrl: 'partials/wumpus/instance.html',
      link: function($scope, elem) {
        $scope.agent = game.cave.agent;
        if(game.cave.wumpus)
          $scope.wumpus = game.cave.wumpus;
        $scope.rooms = game.cave.rooms;

        elem.find('.game-container')
          .css('width', game.cave.bounds.maxx-game.cave.bounds.minx)
          .css('height', game.cave.bounds.maxy-game.cave.bounds.miny);

        $scope.$on('$destroy', $scope.$watch(function() { return !$scope.agent.alive || $scope.agent.win; }, function(end) {
          if(end) {
            elem.find('.game-container').css('opacity', '0.3');
            var message;
            if($scope.agent.win) {
              message = 'ヾ(⌐■_■)ノ♪' + '<br>You won.';
            } else {
              message = 'You lost. ... ' + '┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻';
            }
            elem.find('.end-message').html(message);
          }
        }));

        $scope.override.keydown = game.keydown;
        $scope.$on('$destroy', function() {
          $scope.override.keydown = angular.noop;
        });

        if(config.game.grain === 'continuous') {
          var $forwardCur = elem.find('.forward-cur');
          var $forwardMax = elem.find('.forward-max');
          $scope.$on('$destroy', $scope.$watch(function() { return game.cave.agent.da; }, function(da) {
            var p = da/config.agent.da_limit * 100;
            $forwardCur.css('width', p+'%');
            $forwardMax.css('width', (100-p)+'%');
          }));

          var $turnMin = elem.find('.turn-min');
          var $turnCur = elem.find('.turn-cur');
          var $turnMax = elem.find('.turn-max');
          $scope.$on('$destroy', $scope.$watch(function() { return game.cave.agent.dt; }, function(dt) {
            var p;
            if(dt === 0) {
              $turnMin.css('width', '50%');
              $turnCur.css('width', '0%');
              $turnMax.css('width', '50%');
            } else if (dt > 0) {
              p = dt/config.agent.dt_limit * 50;
              $turnMin.css('width', '50%');
              $turnCur.css('width', p+'%');
              $turnMax.css('width', (50-p)+'%');
            } else {
              p = -dt/config.agent.dt_limit * 50;
              $turnMin.css('width', (50-p)+'%');
              $turnCur.css('width', p+'%');
              $turnMax.css('width', '50%');
            }
          }));
        }

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

        $scope.showWumpus = function() {
          return $scope.wumpus &&
            $scope.wumpus.alive &&
            $scope.wumpus.inRooms.some(function(room) { return room.visible; });
        };
      } // end link
    };
  }
]) // end wumpusInstance directive
// TODO two directives: wumpusRoom-Human vs wumpusRoomMachine
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

        if(game.cave.wumpus)
          $scope.$on('$destroy', $scope.$watch(function() { return game.cave.wumpus.inRooms; }, updateHtml));
        $scope.$on('$destroy', $scope.$watch(function() { return game.cave.agent.inRooms; }, updateHtml));

        function updateHtml() {
          // TODO sense should be an action
          var senses = $scope.room.senses();
          var hasAgent = game.cave.agent.alive && !game.cave.agent.win && (game.cave.agent.inRooms.indexOf($scope.room) !== -1);
          var html =
            addText(senses.nearbyCount, 'black', true) +
            addText('Exit', 'black', $scope.room.hasExit) +
            addText(['Gold', 'glitter'], 'gold', [$scope.room.hasGold, senses.glitter]) +
            addText(['Pit', 'breeze'], 'blue', [$scope.room.hasPit, senses.breeze]) +
            addText('Agent', 'black', hasAgent) +
            '';
          if(game.cave.wumpus) {
            var hasWumpus = game.cave.wumpus.alive && (game.cave.wumpus.inRooms.indexOf($scope.room) !== -1);
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
        $scope.$on('$destroy', $scope.$watch('agent.hasGold', function() {
          if($scope.agent.hasGold)
            elem.css('border-color', 'gold').find('span').css('border-color', 'gold');
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
