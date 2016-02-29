'use strict';
// this is a function to support subgraphs

var _ = require('lodash');
var ideas = require('../ideas');
var discrete = require('../../planning/primitives/discrete');
var number = require('../../planning/primitives/number');

// @param transitions: an array of transitions
//  - { vertex_id: id, replace: number }
//  - { vertex_id: id, combine: number }
//  - { vertex_id: id, replace: discrete }
//  - { vertex_id: id, cycle: { value: javascript number, unit: idea.id } } // the value is the number of steps to cycle
//  - { vertex_id: id, replace_id: id } // (both are vertex_id's)
//  - AC: actuator.runBlueprint depends on this structure
//  - AC: actuator.runBlueprint does a _.clone() on each object, and replaces vertex_id
// @param actual: boolean (default: false)
//  - if true, write the updates to the data; if false, write the updates to the cache
// @return
//  - if actual, return this
//  - if !actual, return the new subgraph
//  - if unable to perform rewrite, return undefined
module.exports = function rewrite(subgraph, transitions, actual) {
  if(!subgraph.concrete)
    return undefined;
  // if there are no transitions, then this action doesn't make sense
  // we could just return subgraph, but that may be confusing
  // XXX why would it be confusing? why would this not be allowed?
  if(transitions.length === 0)
    return undefined;

  actual = (actual === true);

  // if this is the actual transition, we apply it to this object
  // if this is a theoretical transition, we apply it to a copy
  if(!actual)
    subgraph = subgraph.copy();

  // validate transitions
  if(!transitions.every(function(t) {
      if(t.hasOwnProperty('vertex_id')) return checkVertex(subgraph, t);
      else if(t.hasOwnProperty('edge_id')) return checkEdge(subgraph, t);
      else return false;
    })) return undefined; // if not all of the transitions are correct, return undefined

  // apply transitions
  transitions.forEach(function(t) {
    if(t.hasOwnProperty('vertex_id')) transitionVertex(subgraph, t, actual);
    else transitionEdge(subgraph, t, actual);
  });

  return subgraph;
}; // end rewrite

Object.defineProperty(module.exports, 'units', { value: {} });
module.exports.units.checkVertex = checkVertex;
module.exports.units.transitionVertex = transitionVertex;
module.exports.units.checkEdge = checkEdge;
module.exports.units.transitionEdge = transitionEdge;

// return true if the vertex transition is valid
function checkVertex(subgraph, t) {
  // if a transition hasn't been specified, there is nothing to do
  if(!(t.replace || t.combine || t.hasOwnProperty('replace_id') || t.cycle))
    return false;

  var match = subgraph.getMatch(t.vertex_id);
  if(!match)
    return false;

  if(!match.options.transitionable) {
    return false;
  }

  var data = subgraph.getData(t.vertex_id);

  // if there is no data, then there is nothing to transition
  // XXX is this valid, can a transition fill it in?
  if(data === undefined)
    return false;

  // verify the transition data
  if(t.replace) {
    if(data.unit && t.replace.unit && data.unit !== t.replace.unit)
      return false;
  } else if(t.hasOwnProperty('replace_id')) {
    var rdata = subgraph.getData(t.replace_id);
    if(data.unit && data.unit && data.unit !== rdata.unit)
      return false;
  } else if(t.cycle) {
    // TODO does the discrete unit need to be defined as 'cyclical' before we can use 'cycle'
    if(data.unit !== t.cycle.unit || !discrete.isDiscrete(data))
      return false;
  } else { // if(t.combine) {
    if(data.unit !== t.combine.unit || !number.isNumber(data) || !number.isNumber(t.combine))
      return false;
  }

  return true;
} // end checkVertex

function transitionVertex(subgraph, t, actual) {
  if(t.replace) {
    subgraph.setData(t.vertex_id, t.replace);
  } else if(t.hasOwnProperty('replace_id')) {
    subgraph.setData(t.vertex_id, subgraph.getData(t.replace_id));
  } else if(t.cycle) {
    var data = _.clone(subgraph.getData(t.vertex_id));
    var states = ideas.load(data.unit).data().states;
    var idx = states.indexOf(data.value)+t.cycle.value;
    idx = (((idx%states.length)+states.length)%states.length);
    data.value = states[idx];
    subgraph.setData(t.vertex_id, data);
  } else { // if(t.combine) {
    subgraph.setData(t.vertex_id, number.combine(subgraph.getData(t.vertex_id), t.combine));
  }

  if(actual)
  // XXX should combine use "update?" or should I perform a combine on the raw
  // - number.combine(v.idea.data(), t.combine)
  // - should number.difference(v.data, v.idea.data()) === 0 before combine?
  // - should _.isEqual(v.data, v.idea.data()) before combine?
    subgraph.getIdea(t.vertex_id).update(subgraph.getData(t.vertex_id));
} // end transitionVertex


function checkEdge(subgraph, t) {
  var edge = subgraph.getEdge(t.edge_id);
  if(!edge)
    return false;

  // if a transition hasn't been specified, there is nothing to do
  if(!(t.hasOwnProperty('replace_src') || t.hasOwnProperty('replace_dst')))
    return false;

  if(!edge.options.transitionable) {
    return false;
  }

  if(t.hasOwnProperty('replace_src')) {
    if(!subgraph.getMatch(t.replace_src))
      return false;
  } else { // if(t.hasOwnProperty('replace_dst')) {
    if(!subgraph.getMatch(t.replace_dst))
      return false;
  }

  return true;
} // end checkEdge

function transitionEdge(subgraph, t, actual) {
  var edge = subgraph.getEdge(t.edge_id);

  if(actual)
    subgraph.getIdea(edge.src).unlink(edge.link, subgraph.getIdea(edge.dst));

  if(t.hasOwnProperty('replace_src')) {
    edge.src = t.replace_src;
  } else { // if(t.hasOwnProperty('replace_dst')) {
    edge.dst = t.replace_dst;
  }

  if(actual)
    subgraph.getIdea(edge.src).link(edge.link, subgraph.getIdea(edge.dst));
} // end transitionEdge