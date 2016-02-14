'use strict';
var ideas = require('../database/ideas');
var links = require('../database/links');
var subgraph = require('../database/subgraph');
// I know there will be other types of sensors eventually
// I just don't know what they will look like

function Sensor() {

}

// @return the id that the plan is saved to (probably also recorded under bp.idea)
Sensor.prototype.save = function() {
  var idea;
  if(this.idea)
    idea = ideas.load(this.idea);
  else {
    idea = ideas.create();
    idea.link(links.list.context, exports.context);
    this.idea = idea.id;
  }

  idea.update(this.prepSave());

  return this.idea;
};

// when we call sensor.save, we need to have an object that can be JSON.stringify
// the data must conform to sensor.load
// (e.g. HardcodedSensor needs to implement prepSave and supply a loader)
Sensor.prototype.prepSave = function() {
  throw new Error(this.constructor.name + ' does not implement prepSave');
};

exports.Sensor = Sensor;

// saving and loading sensors
// register constructors by name so we can load saved sensors
exports.loaders = {};
exports.load = function(id) {
  var data = ideas.load(id).data();
  if(!(data.type === 'sensor' && data.sensor && typeof data.subtype === 'string'))
    return undefined;
  return exports.loaders[data.subtype](data.sensor);
};
exports.list = function(contexts) {
  // XXX this is copy-pasta from blueprint
  // - same with the whole save/load mechanism
  // - should I create a common ancestor for this sort of thing?
  // build our search
  var sg = new subgraph.Subgraph();
  // this is the node in the graph that we care about
  var result = sg.addVertex(subgraph.matcher.filler);
  // we have our base context
  sg.addEdge(result, links.list.context, sg.addVertex(subgraph.matcher.id, exports.context));
  if(contexts) {
    // a single context presented as an ID string
    // a single proxy idea
    if(typeof contexts === 'string' || contexts.id)
      sg.addEdge(result, links.list.context, sg.addVertex(subgraph.matcher.id, contexts), 1);
    // an array of contexts
    else if(contexts.length)
      contexts.forEach(function(c) {
        sg.addEdge(result, links.list.context, sg.addVertex(subgraph.matcher.id, c), 1);
      });
  }

  // search for matches
  var matches = subgraph.search(sg);
  if(matches.length === 0)
    return [];

  // we have a set of subgraphs that match
  // we only care about the ideas that match
  // FIXME can I think of any situation where I want the ID and not the sensor?
  // - why is this not returning sensor.load(result.idea)?
  return matches.map(function(m) {
    return m.getIdea(result);
  });
};
require('../config').onInit(function() {
  exports.context = ideas.context('sensor');
});
