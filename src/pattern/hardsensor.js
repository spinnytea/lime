'use strict';
var _ = require('lodash');
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

  // the requirements are going to use whatever IDs they please
  // the sensor function needs to reference these with 'well known' names (variables)
  // the aliases will map a name we expect to the generated ID
  // XXX I suppose we could just init test the hard coded IDs (throw an exception if it's wrong); it's not like they will change once it's been created
  //this.aliases = {};
  this.requirements = new subgraph.Subgraph();

  // the name of the hard coded function (listed in hardsensor.sensors
  // must be defined before calling HardcodedSensor.prototype.sense
  this.sensor = null;

  this.groupfn = exports.groupfn.none;
  // some group functions need to have specific config data to work
  this.groupConfig = undefined;
}

// @param state: a subgraph
HardcodedSensor.prototype.sense = function(state) {
  var that = this;
  exports.groupfn[this.groupfn](subgraph.match(state, this.requirements), this.groupConfig).forEach(function(glueGroup) {
    exports.sensors[that.sensor](state, glueGroup);

    // xTODOx subgraph.rewrite needs to support idea.link and idea.unlink
    // - maybe?
    // - that's only if we use transitions to do this
    // - transitions were specifically written to handle the data within a vertex node
    // - manipulating anything other than that is... awkward
    // - we probably want a different location to do that
    // - anything we do in a transition, a subgraph needs to have support for
    // - subgraphs aren't going to handled "ensure this list of links" very well; that's basically a list of subgraphs
    // TODO we could just have the sensor function rewrite the graph directly, but we need this mechanism for learned sensors
    // - so we need a another rewrite thing similar to transitions for subgraph
    // - we can do it directly in the sensors?
    // - THIS needs to support link and unlink to start
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