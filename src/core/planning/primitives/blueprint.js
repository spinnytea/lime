'use strict';
// I'm going to break some javascript rules
// this is the start of an prototype chain
// In java terms, this in an "abstract class"
// Other classes should:
//   function SerialPlan() { blueprint.Blueprint.call(this); }
//   _.extend(SerialPlan.prototype, blueprint.Blueprint.prototype);
var subgraph = require('../../database/subgraph');

function Blueprint() {
  this.requirements = new subgraph.Subgraph();
}

Blueprint.prototype.tryTransition = function() {
  throw new Error(this.constructor.name + ' does not implement tryTransition');
};

exports.Blueprint = Blueprint;
