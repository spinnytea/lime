'use strict';
// this builds on a blueprint to represent a set of serial steps
// if a blueprint is a single step, then this is a list of steps
var _ = require('lodash');
var blueprint = require('./primitives/blueprint');

function SerialAction() { blueprint.Action.call(this); }
_.extend(SerialAction.prototype, blueprint.Action.prototype);

exports.Action = SerialAction;
