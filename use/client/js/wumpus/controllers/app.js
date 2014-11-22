'use strict';

// required rooms:
// (if we generate the rooms in this manner using this algorithm, then we can guarantee that there are not pits between the exit and the gold)
// (some of the game will be stupid easy, but they will always be solvable)
// . exit   - first room
// . wumpus - randomly placed between exit (exclusive) and gold (inclusive)
// . gold   - placed at roomCount/2
// . pit    - after gold is placed, generated with some probability (e.g. n/(roomCount/2), where n is a constant number of rooms we'd like to see)
var MIN_ROOM_COUNT = 4;
var MAX_ROOM_COUNT = 30;

module.exports = angular.module('lime.client.wumpus.app', []);
module.exports.controller('lime.client.wumpus.app', [
  '$scope', 'lime.client.wumpus.room', 'lime.client.wumpus.agent', 'lime.client.wumpus.wumpus',
  function($scope, Room, agent, wumpus) {
    $scope.name = 'example';

    $scope.gameConfig = {
      chance: 'deterministic',
      grain: 'discrete',
      observable: 'fully',
      timing: 'static',
      roomCount: 4,
    };

    $scope.generateGame = function() {
		  // This will use an implementation of Prim's Algorithm

      $scope.roomCount = Math.min(MAX_ROOM_COUNT, Math.max(MIN_ROOM_COUNT, $scope.roomCount));

      // the room where the cold will be placed
//      var goldRoom = Math.floor($scope.roomCount / 2);
//      var placedWumpus = false;

      var nextRooms = [];
      var room = new Room(0, 0, { hasExit: true });
      nextRooms.push(room);
      agent.placeInRoom(room);

      console.log(agent);
      console.log(wumpus);
    };
  }
]);
