'use strict';
// this represents an single idea with possible stats
// e.g. a boolean is true/false; you can classify colors as roygbiv
// this gets tricky in an analog world (is it analog? that's for another time)
// what is a color? a collection of numbers? sensor data?
// but that's the point; we want to categorize it so it's "easier" to work with, or more human to work with at least

var ideas = require('../../database/ideas');

//
// the discrete value
//

var typeName = 'lime_discrete';

// obj:
//   type (optional)
//   value
//   unit
exports.isDiscrete = function(obj) {
  if(typeof obj !== 'object')
    return false;

  if(obj.type)
    return obj.type === typeName;

  if(typeof obj.unit !== 'string')
    return false;

  var unit = ideas.load(obj.unit);
  if(unit.data().type !== definitionTypeName)
    return false;

  if(unit.data().states.indexOf(obj.value) === -1)
    return false;

  obj.type = typeName;
  return true;
};

// { type, unit, value }
exports.difference = function(d1, d2) {
  if(!exports.isDiscrete(d1) || !exports.isDiscrete(d2))
    return undefined;
  if(d1.unit !== d2.unit)
    return undefined;

  if(d1.value === d2.value)
    return 0;
  return 1;
};

//
// how to define/recall definitions of discrete values
// this stores the possible states each can take
//
var definitionTypeName = 'lime_discrete_definition';
exports.definitions = {};
exports.definitions.similar = {type: definitionTypeName};

// create a new definition of a discrete value
// states must be an array of primitive javascript values (number, string, etc)
exports.definitions.create = function(states) {
  if(!states.length || states.length <= 1)
    throw new TypeError('must pass an array of states with more than one value');

  return ideas.create({
    type: definitionTypeName,
    states: states,
  });
};
