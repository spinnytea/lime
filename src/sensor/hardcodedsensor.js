'use strict';
var _ = require('lodash');
var sensor = require('./sensor');
var subgraph = require('../database/subgraph');

// Task 57
//
// People learn to use their vision as they grow.
// They learn that a "dot" can be "inside" another "circle."
// This is what it means for an agent to be in a room,
//   this is why I draw something visual to the screen, so I - the person - can see it.
// But the LM cannot process this information.
// The LM hasn't spent the time building up visual models of what it means to be inside of something.
//
// The way I want to represent "inside" for the LM is based on distance, or math.
// But I haven't taught it any math.
// I haven't taught it to make connections between different kinds of models,
//   and I haven't taught it how to optimize it's math by using a library.
// So.
// My first sensor will be hard coding that optimized sensor the way I expect it will be eventually produced.

function HardcodedSensor() {
  sensor.Sensor.call(this);

  // the requirements are going to use whatever IDs they please
  // the sensor function needs to reference these with 'well known' names (variables)
  // the aliases will map a name we expect to the generated ID
  // XXX I suppose we could just init test the hard coded IDs (throw an exception if it's wrong); it's not like they will change once it's been created
  //this.aliases = {};
  this.requirements = new subgraph.Subgraph();

  // the name of the hard coded function (listed in hardsensor.sensors
  // must be defined before calling HardcodedSensor.prototype.sense
  this.sensor = null;

  this.groupfn = exports.groupfn.none.name;
  // some group functions need to have specific config data to work
  this.groupConfig = undefined;
}
_.extend(HardcodedSensor.prototype, sensor.Sensor.prototype);

HardcodedSensor.prototype.prepSave = function() {
  return {
    type: 'sensor',
    subtype: 'HardcodedSensor',
    sensor: {
      idea: this.idea,
      requirements: subgraph.stringify(this.requirements),
      sensor: this.sensor,
      groupfn: this.groupfn,
      groupConfig: this.groupConfig
    }
  };
};

// @param state: a subgraph
HardcodedSensor.prototype.sense = function(state) {
  var that = this;
  exports.groupfn[this.groupfn](subgraph.match(state, this.requirements), this.groupConfig).forEach(function(glueGroup) {
    var instruction = exports.sensors[that.sensor](state, glueGroup);

    if(instruction) {
      if(instruction.ensureLinks) {
        var from = instruction.from; // idea
        var to = instruction.to; // [idea]
        var link = instruction.ensureLinks; // links.list.something
        // remove all existing
        from.link(link).forEach(function(idea) { from.unlink(link, idea); });
        // add all new
        to.forEach(function(t) { from.link(link, t); });
      }
    }
  });
};

exports.Sensor = HardcodedSensor;

// due to serialization of javascript objects...
// all action impls must be registered here
exports.sensors = {};

// some sensors need to be processed as a group
// (e.g. checking which rooms an agent is in needs to be grouped by agent)
// this should group the glues into logical
exports.groupfn = {
  none: function none(glues, groupConfig) {
    // no special grouping
    // every match is in it's own group
    void(groupConfig);
    return glues.map(function(g) { return [g]; });
  },
  byOuterIdea: function byOuterId(glues, groupConfig) {
    // groupConfig is the requirements vertex id
    // this maps to the outer graph via the glue
    return _.values(glues.reduce(function(sets, glue) {
      var outer = glue[groupConfig];
      if(!(outer in sets))
        sets[outer] = [];
      sets[outer].push(glue);
      return sets;
    }, {}));
  }
};

sensor.loaders.HardcodedSensor = function(sensor) {
  var hs = new HardcodedSensor();
  hs.idea = sensor.idea;
  hs.requirements = subgraph.parse(sensor.requirements);
  hs.sensor = sensor.sensor;
  hs.groupfn = sensor.groupfn;
  hs.groupConfig = sensor.groupConfig;
  return hs;
};
