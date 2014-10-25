'use strict';
var _ = require('lodash');
var blueprint = require('./primitives/blueprint');

function SerialPlan() { blueprint.Blueprint.call(this); }
_.extend(SerialPlan.prototype, blueprint.Blueprint.prototype);

exports.SerialPlan = SerialPlan;
