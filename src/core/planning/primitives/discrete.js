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

// FIXME never assume that discrete values can be compared "exactly"
// - meaning, we need to check "is discrete" any time we expect to compare a discrete value
// - and we need to signal as such
// - (e.g. vertex_discrete)
//	Number doesn't have this problem so it can be considered separately
// TODO create a factory method
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

  var differenceFnName = ideas.load(d1.unit).data().difference || 'default';

  return exports.definitions.difference[differenceFnName](d1, d2);
};

//
// how to define/recall definitions of discrete values
// this stores the possible states each can take
//
var definitionTypeName = 'lime_discrete_definition';
exports.definitions = {};
exports.definitions.similar = {type: definitionTypeName};
exports.definitions.difference = {
  default: function(d1, d2) {
    if(d1.value === d2.value)
      return 0;
    return 1;
  },
  cycle: function(d1, d2) {
    var states = ideas.load(d1.unit).data().states;
    var i1 = states.indexOf(d1.value);
    var i2 = states.indexOf(d2.value);

    // a > b
    //  a - b
    //  b - a + len
    // a < b
    //  b - a
    //  a - b + len

    return Math.min(
      (i1-i2 + states.length)%states.length,
      (i2-i1 + states.length)%states.length
    );
  },
};

// create a new definition of a discrete value
// states must be an array of primitive javascript values (number, string, etc)
exports.definitions.create = function(states, differenceFnName) {
  if(!states.length || states.length <= 1)
    throw new TypeError('must pass an array of states with more than one value');

  var data = {
    type: definitionTypeName,
    states: states,
  };

  if(differenceFnName) {
    if(!exports.definitions.difference[differenceFnName])
      throw new TypeError(differenceFnName + ' does not exist');
    data.difference = differenceFnName;
  }

  return ideas.create(data);
};
