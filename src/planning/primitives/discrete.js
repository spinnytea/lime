'use strict';
// this represents an single idea with possible stats
// e.g. a boolean is true/false; you can classify colors as roygbiv
// this gets tricky in an analog world (is it analog? that's for another time)
// what is a color? a collection of numbers? sensor data?
// but that's the point; we want to categorize it so it's "easier" to work with, or more human to work with at least

//
// the discrete value
//

// FIXME never assume that discrete values can be compared "exactly"
// - meaning, we need to check "is discrete" any time we expect to compare a discrete value
// - and we need to signal as such
// - (e.g. vertex_discrete)
//	Number doesn't have this problem so it can be considered separately
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

  var unit = exports.boundaries.getUnitData(obj.unit);
  if(unit.type !== definitionTypeName)
    return false;

  if(unit.states.indexOf(obj.value) === -1)
    return false;

  obj.type = typeName;
  return true;
};

exports.cast = function(obj) {
  if(exports.isDiscrete(obj))
    return obj;
  return undefined;
};

// { type, unit, value }
exports.difference = function(d1, d2) {
  if(!exports.isDiscrete(d1) || !exports.isDiscrete(d2))
    return undefined;
  if(d1.unit !== d2.unit)
    return undefined;

  var differenceFnName = exports.boundaries.getUnitData(d1.unit).difference || 'default';

  return exports.definitions.difference[differenceFnName](d1, d2);
};


//
// how to define/recall definitions of discrete values
// this stores the possible states each can take
//

var definitionTypeName = 'lime_discrete_definition';

exports.definitions = {};
// use the similar matcher to find "types of discrete definitions"
// TODO deprecate: you really should know the definition you are looking for
exports.definitions.similar = {type: definitionTypeName};

// some stock difference functions
// more can be added during setup of application-specific uses
// Note: differences need to be simple
// - subgraph.matcher.discrete requires difference === 0
exports.definitions.difference = {
  default: function(d1, d2) {
    if(d1.value === d2.value)
      return 0;
    return 1;
  },
  cycle: function(d1, d2) {
    var states = exports.boundaries.getUnitData(d1.unit).states;
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
  }
};

// create a new definition of a discrete value
// states must be an array of primitive javascript values (number, string, etc)
exports.definitions.create = function(states, differenceFnName) {
  if(!states || !states.length || states.length <= 1)
    throw new TypeError('must pass an array of states with more than one value');

  var data = {
    type: definitionTypeName,
    states: states
  };

  if(differenceFnName) {
    if(!exports.definitions.difference[differenceFnName])
      throw new TypeError('"' + differenceFnName + '" does not exist');
    data.difference = differenceFnName;
  }

  return exports.boundaries.createUnitData(data);
};


Object.defineProperty(exports, 'boundaries', { value: {} });
exports.boundaries.createUnitData = createUnitData;
exports.boundaries.getUnitData = getUnitData;
var config = require('../../config');
var ideas = require('../../database/ideas');

function createUnitData(data) {
  return ideas.create(data);
}

function getUnitData(unit) {
  return ideas.load(unit).data();
}


/* istanbul ignore next */
config.onInit(function() {
  if(!config.data.discrete) {
    config.data.discrete = {};
  }

  // setup some stock discrete definitions
  if(!config.data.discrete.boolean) {
    var idea = exports.definitions.create([true, false]);
    config.data.discrete.boolean = idea.id;
    ideas.close(idea);
  }

  exports.definitions.list = {
    boolean: config.data.discrete.boolean
  };
});
