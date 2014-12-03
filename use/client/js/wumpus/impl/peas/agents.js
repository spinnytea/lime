'use strict';

var config = require('../config');
var game = require('../game');
var grain = require('./grain');

// the wumpus will skip a turn every so often
// (discrete only)
var skip = -1;

exports.update = {
  single: angular.noop,
  multi: function() {
    var a = game.cave.agent;
    var w = game.cave.wumpus;
    if(w.alive && a.alive) {
      if(config.game.grain === 'discrete') {
        skip = (skip+1)%3;
        if(skip === 0)
          return;
      }

      // move the wumpus towards the agent
      // - if not "mostly correct", turn correct
      // - if already "mostly correct", move forward

      var delta = w.r-Math.atan2(a.y-w.y, a.x-w.x);
      var threshold = Math.PI/4;

      // clamp the angles to something we can work with
      while(delta > Math.PI) delta -= Math.PI*2;
      while(delta < -Math.PI) delta += Math.PI*2;

      if(delta > threshold) {
        if(w.dt >= 0)
          grain.move[config.game.grain].left(w);
      } else if(delta < -threshold) {
        if(w.dt <= 0)
          grain.move[config.game.grain].right(w);
      } else if(w.da < config.multi.wumpus_da_limit)
        grain.move[config.game.grain].up(w);
    }
  },
};