'use strict';

var Agent = require('./agent');
//var Room = require('./room');

exports.cave = undefined;
exports.generate = function() {
  exports.cave = new Cave();
};

function Cave() {
  this.wumpus = new Agent();
  this.agent = new Agent({ hasGold: false, wumpus: this.wumpus });
}
