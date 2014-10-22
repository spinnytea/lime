'use strict';
var _ = require('lodash');
var ideas = require('./ideas');
var ids = require('../ids');

// this is an overlay on the idea database
// it is a proxy or wrapper around the idea graph
// it's main purpose is to find a subgraph within the larger database
//
// you define the shape the graph you want to find, each node has it's own matcher

function Subgraph() {
  this.prevVertexId = undefined; // initially undefined

  this.vertices = {};
  this.edges = [];

  // true
  // - does this represent a specific subgraph
  // - all of the vertices have a specific ID
  // false
  // - is it a description of something to find
  this.concrete = false;
}
Subgraph.prototype.copy = function() {
  var sg = new Subgraph();
  sg.prevVertexId = this.prevVertexId;
  _.forIn(this.vertices, function(v) {
    sg.vertices[v.vertex_id] = _.clone(v);
  });
  this.edges.forEach(function(e) {
    sg.addEdge(e.src.vertex_id, e.link, e.dst.vertex_id, e.pref);
  });
  sg.concrete = this.concrete;
  return sg;
};
// exports.matcher or equivalent
Subgraph.prototype.addVertex = function(matcher, matchData) {
  var id = (this.prevVertexId = ids.next.anonymous(this.prevVertexId));
  this.vertices[id] = {
    vertex_id: id,
    matches: matcher,
    matchData: matchData,
    idea: undefined, // this is what we are ultimately trying to find
  };

  if(matcher === exports.matcher.id)
    this.vertices[id].idea = ideas.load(matchData);

  return id;
};
// src, dst: a vertex ID
// link: the link from src to dst
// pref: higher prefs will be considered first (default: 0)
Subgraph.prototype.addEdge = function(src, link, dst, pref) {
  this.edges.push({
    src: this.vertices[src],
    link: link,
    dst: this.vertices[dst],
    pref: (pref || 0),
  });
};

exports.Subgraph = Subgraph;


// default matchers; but you can provide your own
exports.matcher = {
  id: function(idea, matchData) {
    // XXX this could be an empty object
    return matchData === idea.id;
  },
  filler: function() {
    return true;
  },
  data: {
    exact: function(idea, matchData) {
      return _.isEqual(idea.data(), matchData);
    },
    similar: function(idea, matchData) {
      // FIXME this implementation is bad and I should feel bad

      // matchData should be contained within data
      var data = idea.data();
      var d2 = _.cloneDeep(data);
      _.merge(d2, matchData);
      return _.isEqual(data, d2);
    },
  },
};


// find a list of subgraphs in the database that matches the supplied subgraph
exports.search = function(subgraph) {
  if(!(subgraph instanceof Subgraph))
    return [];
  if(subgraph.edges.length === 0)
    return [];

  var selectedEdge;
  var selectedBranches;
  var nextSteps = [];

  // find an edge to expand
  subgraph.edges.forEach(function(currEdge) {
    var isSrc = !_.isUndefined(currEdge.src.idea);
    var isDst = !_.isUndefined(currEdge.dst.idea);

    if(isSrc ^ isDst) {

      var currBranches = (isSrc ? (currEdge.src.idea.link(currEdge.link)) : (currEdge.dst.idea.link(currEdge.link.opposing)) );

      if(!selectedEdge) {
        selectedEdge = currEdge;
        selectedBranches = currBranches;
      } else if(currEdge.pref === selectedEdge.pref) {
        if(currBranches.length < selectedBranches.length) {
          selectedEdge = currEdge;
          selectedBranches = currBranches;
        }
      } else if(currEdge.pref > selectedEdge.pref) {
          selectedEdge = currEdge;
          selectedBranches = currBranches;
      }

    } else if(isSrc && isDst) {
      // verify that all this edge is present
      // TODO cache the result so we don't need to check this for every subgraph
      if(currEdge.src.idea.link(currEdge.link).filter(function(idea) { return idea.id === currEdge.dst.id; }) === 0)
        // if we can't resolve this edge, then this graph is invalid
        return [];
    }
  }); // end edges.forEach

  if(selectedEdge) {
    // pick the vertex to expand
    var vertex = _.isUndefined(selectedEdge.src.idea) ? selectedEdge.src : selectedEdge.dst;

    var matchedBranches = selectedBranches.filter(function(idea) {
      return vertex.matches(idea, vertex.matchData);
    });

    if(matchedBranches.length === 0) {
      return [];
    } else if(matchedBranches.length === 1) {
      // we can reuse subgraph at the next level
      vertex.idea = matchedBranches[0];
      nextSteps.push(subgraph);
    } else {
      // we need to branch; create a new subgraph instance for each level
      matchedBranches.forEach(function(idea) {
        var sg = subgraph.copy();
        sg.vertices[vertex.vertex_id].idea = idea;
        nextSteps.push(sg);
      });
    }
  }

  // base case
  // there are no edges that can be expanded
  if(nextSteps.length === 0) {
    if(!subgraph.edges.every(function(edge) { return edge.src.idea && edge.dst.idea; }))
      return [];
    subgraph.concrete = true;
    return [ subgraph ];
  } else {
    // do the next iteration of searches
    // TODO lodash accumulator
    var ret = [];
    nextSteps.forEach(function(sg) {
      ret.push.apply(ret, exports.search(sg));
    });
    return ret;
  }

}; // end exports.search