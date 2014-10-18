'use strict';
var _ = require('lodash');

//
// this file implements State and Action so we can perform a plan with A* (astar)
// here we have a number slide game
// 0 is the position we can slide around
//

var DIRECTIONS = Object.freeze({
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
});

var NumberSlideAction = exports.Action = function(dir) {
  this.dir = dir;
};

NumberSlideAction.prototype.cost = function() {
  return 1;
};

// XXX error checking? can we see apply this action?
NumberSlideAction.prototype.apply = function(from) {
  var state = new NumberSlideState(_.cloneDeep(from.numbers));

  var that = this;
  state.find(0, function(y, x) {
    var dy = 0;
    var dx = 0;
    switch(that.dir) {
      case DIRECTIONS.up:    dy = -1; break;
      case DIRECTIONS.down:  dy =  1; break;
      case DIRECTIONS.left:  dx = -1; break;
      case DIRECTIONS.right: dx =  1; break;
    }
    state.numbers[y][x] = state.numbers[y+dy][x+dx];
    state.numbers[y+dy][x+dx] = 0;
  });

  return state;
};

//
//
//

// @param numbers: a matrix of values; must be at least 1x1
// XXX error checking? throw a TypeError?
var NumberSlideState = exports.State = function(numbers) {
  this.numbers = numbers;
  // the method will lazy create this
  this._actions = null;
};

// calculate the manhattan distance of all the numbers
// XXX error checking? (to instanceof NumberSlideState) && (this.length === to.length)
NumberSlideState.prototype.distance = function(to) {
  var total = 0;

  // iterate over my numbers
  _.forEach(this.numbers, function(col, y) { _.forEach(col, function(num, x) {

      to.find(num, function(ty, tx) {
        total += Math.abs(tx - x) + Math.abs(ty - y);
      });

  });});

  return total;
};
NumberSlideState.prototype.actions = function() {
  if(this._actions === null) {
    this._actions = [];

    var that = this;
    this.find(0, function(y, x) {
      if(y > 0)
        that._actions.push(new NumberSlideAction(DIRECTIONS.up));
      if(y < that.numbers.length-1)
        that._actions.push(new NumberSlideAction(DIRECTIONS.down));
      if(x > 0)
        that._actions.push(new NumberSlideAction(DIRECTIONS.left));
      if(x < that.numbers[y].length-1)
        that._actions.push(new NumberSlideAction(DIRECTIONS.right));
    });
  }
  return this._actions;
};
NumberSlideState.prototype.matches = function(state) {
  return _.isEqual(this.numbers, state.numbers);
};

// helper function to find the value within the array
// when found, we will call the callback (this.numbers[y][x] ~= function(y, x))
// this will only call the callback once, on the first value it finds
NumberSlideState.prototype.find = function(val, callback) {
  var keepGoing = true;
  _.forEach(this.numbers, function(col, y) {
    _.forEach(col, function(num, x) {
      if(val === num) {
        callback(y, x);
        keepGoing = false;
      }
      return keepGoing;
    });
    return keepGoing;
  });
};