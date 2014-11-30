'use strict';

var config = require('../config');
var game = require('../game');
var grain = require('./grain');

exports.update = {
  single: angular.noop,
  multi: function() {
    var a = game.cave.agent;
    var w = game.cave.wumpus;
    if(w.alive && a.alive) {
      // move the wumpus towards the agent
      // - if not "mostly correct", turn correct
      // - if already "mostly correct", move forward
      // TODO work out angles so wumpus doesn't turn around

      var delta = w.r-Math.atan2(a.y-w.y, a.x-w.x);
      var threshold = Math.PI/4;

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