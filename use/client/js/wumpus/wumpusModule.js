'use strict';

// XXX I am managing the data AAALLLLLL wrong
//  - In many cases, I am writing this under the impression that there "might be multiple instances"
//    - multiple connections
//    - multiple games going on at one time
//  - In other cases, I am writing this assuming there will only be one.

var config = require('./impl/config');
var game = require('./impl/game');
var socket = require('./socket');

// some aesthetics for when the game ends
// and puts a border between the game area and the HUD
var GAME_BOX_BORDER = 12;

module.exports = angular.module('lime.client.wumpus', [
  require('../subgraph/subgraphModule').name,
])
.controller('lime.client.wumpus.app', [
  '$scope', 'lime.client.subgraph.data',
  function($scope, subgraphData) {
    $scope.config = config;
    $scope.game = game;
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

    $scope.contexts = subgraphData.list;
  }
]) // end lime.client.wumpus.app controller
.directive('wumpusSocket', [
  '$location', 'lime.client.subgraph.data',
  function($location, subgraphData) {
    var COMMAND_TYPES = {
      'command': 'command', 'c': 'command',
      'context': 'context',
      'actuator': 'actuator', 'a': 'actuator',
      'goal': 'goal', 'g': 'goal',
    };
    return {
      templateUrl: 'partials/wumpus/socket.html',
      link: function($scope) {
        $scope.$on('$destroy', socket.connect($scope, $location.protocol(), $location.host()));

        // because of the ng-if, the game has already been setup
        if(config.game.player === 'lemon' && config.game.timing === 'static')
          socket.sense();

        socket.on('context', subgraphData.add);
        socket.emit('context');

        $scope.message = '';
        socket.on('message', function(str) {
          $scope.serverMessage = str;
        });
        $scope.keyup = function($event) {
          if($event.keyCode === 13) { // enter
            var idx = $scope.message.indexOf(' ');
            if(idx === -1) idx = $scope.message.length;
            var type = $scope.message.substring(0, idx);

            // only process this if it starts with a valid command
            if(type in COMMAND_TYPES) {
              socket.emit(COMMAND_TYPES[type], $scope.message.substring(type.length+1));
              $scope.message = '';
            }
          }
        };
      } // end link
    };
  }
]) // end wumpusSocket directive
.directive('wumpusInstance', [
  function() {
    return {
      templateUrl: 'partials/wumpus/instance.html',
      link: function($scope, elem) {
        elem.find('.game-container')
          .css('width', game.cave.bounds.maxx-game.cave.bounds.minx+GAME_BOX_BORDER*2)
          .css('height', game.cave.bounds.maxy-game.cave.bounds.miny+GAME_BOX_BORDER*2);

        $scope.$on('$destroy', $scope.$watch(function() { return !game.cave.agent.alive || game.cave.agent.win; }, function(end) {
          if(end) {
            // XXX should the whole board become visible?
            elem.find('.game-container')
              .css('opacity', '0.3')
              .css('background-color', '#ccc')
              .css('border-radius', config.room.radius);
            var message;
            if(game.cave.agent.win) {
              message = 'ヾ(⌐■_■)ノ♪' + '<br>You won.';
            } else {
              message = 'You lost. ... ' + '┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻';
            }
            elem.find('.end-message').html(message);
          }
        }));

        if(config.game.player === 'person') {
          $scope.override.keydown = game.keydown;
          $scope.$on('$destroy', function() {
            $scope.override.keydown = angular.noop;
          });
        }

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
          if(config.game.player === 'lemon')
            socket.sense();
          dynamicTimeout = setTimeout(dynamicUpdate, config.timing.updateDelay);
        }
        if(config.game.timing === 'dynamic') {
          var dynamicTimeout;
          $scope.$on('$destroy', function() { clearTimeout(dynamicTimeout); });

          // we need to wait for the digest cycle to end
          setTimeout(dynamicUpdate, 0);
        }

        $scope.showWumpus = function() {
          return game.cave.wumpus &&
            game.cave.wumpus.alive &&
            game.cave.wumpus.inRooms.some(function(room) { return room.visible; });
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
          .css('left', $scope.room.x - game.cave.bounds.minx - config.room.radius + GAME_BOX_BORDER)
          .css('top', $scope.room.y - game.cave.bounds.miny - config.room.radius + GAME_BOX_BORDER);

        $scope.$on('$destroy', $scope.$watch(function() { return $scope.room.sense(); }, updateHtml, true));

        if(game.cave.wumpus)
          $scope.$on('$destroy', $scope.$watch(function() { return game.cave.wumpus.inRooms; }, updateHtml));
        $scope.$on('$destroy', $scope.$watch(function() { return game.cave.agent.inRooms; }, updateHtml));

        function updateHtml() {
          var senses = $scope.room.sense();
          var hasAgent = game.cave.agent.alive && !game.cave.agent.win && (game.cave.agent.inRooms.indexOf($scope.room) !== -1);
          var html =
            addText($scope.room.id, 'black', true) +
            addText(['Exit', 'sunlight'], 'black', [$scope.room.hasExit, senses.sunlight]) +
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
          if(strs === undefined) return '';
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
          elem.css('left', $scope.agent.x - game.cave.bounds.minx - config.agent.radius + GAME_BOX_BORDER);
        }));
        $scope.$on('$destroy', $scope.$watch('agent.y', function() {
          elem.css('top', $scope.agent.y - game.cave.bounds.miny - config.agent.radius + GAME_BOX_BORDER);
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
