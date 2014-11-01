'use strict';
var _ = require('lodash');
var ideas = require('./ideas');
var ids = require('../ids');
var number = require('../planning/primitives/number');

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
  this.concrete = true;
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

    // this is how we are going to match an idea in the search and match
    matches: matcher,
    matchData: matchData,

    // this is what we are ultimately trying to find with a subgraph search
    idea: undefined,

    // this is for the rewrite
    // if undefined, it hasn't be fetched
    // otherwise, it's the value of idea.data() before we tried to change it
    data: undefined,
  };

  if(matcher === exports.matcher.id)
    this.vertices[id].idea = ideas.load(matchData);
  else
    this.concrete = false;

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
  this.concrete = false;
};

exports.Subgraph = Subgraph;


// default matchers; but you can provide your own
exports.matcher = {
  id: function(idea, matchData) {
    // XXX this could be an empty object
    return (matchData.id || matchData) === idea.id;
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
//
// use Prim's algorithm to expand the know subgraph
// we are trying to identify all of the vertices
// we use edges to find new ones
exports.search = function(subgraph) {
  if(subgraph.concrete)
    return [subgraph];

  var selectedEdge;
  var selectedBranches;
  var nextSteps = [];

  // find an edge to expand
  subgraph.edges.forEach(function(currEdge) {
    var isSrc = !_.isUndefined(currEdge.src.idea);
    var isDst = !_.isUndefined(currEdge.dst.idea);

    if(isSrc ^ isDst) {

      var currBranches = (isSrc ? (currEdge.src.idea.link(currEdge.link)) : (currEdge.dst.idea.link(currEdge.link.opposite)) );

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

  // expand the edge
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

  // recurse
  // there are no edges that can be expanded
  if(nextSteps.length === 0) {
    // check all vertices to ensure they all have ideas defined
    var allVertices = true;
    _.forIn(subgraph.vertices, function(v) {
      if(v.idea) return true;
      return (allVertices = false);
    });
    if(!allVertices)
      return [];

//    if(!subgraph.edges.every(function(edge) { return edge.src.idea && edge.dst.idea; }))
//      return [];

    subgraph.concrete = true;
    return [ subgraph ];
  } else {
    // do the next iteration of searches
    // TODO lodash accumulator
    var ret = [];
    nextSteps.forEach(function(sg) {
      Array.prototype.push.apply(ret, exports.search(sg));
    });
    return ret;
  }

}; // end exports.search

// use subgraphOuter as a base
// does subgraphInner fit inside of subgraphOuter?
// (basically a subgraph match on two subgraphs)
exports.match = function(subgraphOuter, subgraphInner) {
  if(!subgraphOuter.concrete)
    throw new RangeError('the outer subgraph must be concrete before you can match against it');

  // if there are no vertices, return nothing
  var numVertices = Object.keys(subgraphInner.vertices).length;
  if(numVertices === 0)
    return [];

  // pre-fill a vertex map with identified thoughts
  var vertexMap = {};
  _.forEach(subgraphInner.vertices, function(vi) {
    if(vi.idea) {
      _.forEach(subgraphOuter.vertices, function(vo) {
        // outer is concrete; vo.idea exists
        if(vi.idea.id === vo.idea.id) {
          vertexMap[vi.vertex_id] = vo.vertex_id;
        }
      });
    }
  });

  // if there are no edges, return the map
  if(subgraphInner.edges.length === 0) {
    if(Object.keys(vertexMap).length === numVertices)
      return [vertexMap];
    return [];
  }

  // with this information, fill out the map using the edges
  // (note: there may not yet be any edges specified)
  return subgraphMatch(_.clone(subgraphOuter.edges), _.clone(subgraphInner.edges), vertexMap)
    .filter(function(map) {
      return Object.keys(map).length === numVertices;
    });
}; // end exports.match

// okay, so this is actually the function that does the matching
// (subgraphMatch is the recursive case, exports.match is the seed case)
//
// map[inner.vertex_id] = outer.vertex_id;
// we will typically use the inner subgraph to find the indices of the outer map
// match all of the innerEdges to the outerEdges
function subgraphMatch(outerEdges, innerEdges, vertexMap) {
  // pick the best inner edge
  // (this should help us reduce the number of branches)
  var innerEdge = innerEdges.reduce(function(prev, curr) {
    if(prev === null || curr.pref > prev.pref)
      return curr;
    return prev;
  }, null);
  innerEdges.splice(innerEdges.indexOf(innerEdge), 1);

  var srcId = innerEdge.src.vertex_id;
  var dstId = innerEdge.dst.vertex_id;
  var srcMapped = (srcId in vertexMap);
  var dstMapped = (dstId in vertexMap);
  var mapValues = _.values(vertexMap);

  // find all matching outer edges
  var matches = outerEdges.filter(function(currEdge) {
    // skip the vertices that are mapped to something different
    if(srcMapped) {
      if(vertexMap[srcId] !== currEdge.src.vertex_id)
        return false;
    } else {
      // currEdge src is mapped to a different inner id
      if(mapValues.indexOf(currEdge.src.vertex_id) !== -1)
        return false;
    }
    if(dstMapped) {
      if(vertexMap[dstId] !== currEdge.dst.vertex_id)
        return false;
    } else {
      // currEdge dst is mapped to a different inner id
      if(mapValues.indexOf(currEdge.dst.vertex_id) !== -1)
        return false;
    }

    return innerEdge.link === currEdge.link &&
      innerEdge.src.matches(currEdge.src.idea, innerEdge.src.matchData) &&
      innerEdge.dst.matches(currEdge.dst.idea, innerEdge.dst.matchData);
  });

  // recurse
  if(matches.length === 0)
    return [];

  return matches.map(function(outerEdge) {
    // update the new matches
    var newMap = _.clone(vertexMap);
    newMap[innerEdge.src.vertex_id] = outerEdge.src.vertex_id;
    newMap[innerEdge.dst.vertex_id] = outerEdge.dst.vertex_id;

    // shallow copy the outer/inner without the current match
    var newOuter = outerEdges.filter(function(e) { return e !== outerEdge; });
    var newInner = innerEdges.filter(function(e) { return e !== innerEdge; });


    if(newInner.length === 0)
      // base case
      // if there are no more inner edges to match, then our vertex map is complete
      return [newMap];
    else
      // recursive case
      // get a list of
      return subgraphMatch(newOuter, newInner, newMap);
  }).reduce(function(list, match) {
    // combine the matches into a single list
    Array.prototype.push.apply(list, match);
    return list;
  }, []);
} // end subgraphMatch


// @param transitions: an array of transitions
//  - { vertex_id: id, replace: number }
//  - { vertex_id: id, combine: number }
//  - { vertex_id: id, replace: discrete }
// @param actual: boolean (default: false)
//  - if true, write the updates to the data; if false, write the updates to the cache
// @return
//  - if actual, return this
//  - if !actual, return the new subgraph
//  - if unable to perform rewrite, return undefined
exports.rewrite = function(subgraph, transitions, actual) {
  if(!subgraph.concrete)
    return undefined;

  actual = (actual === true);

  // if this is the actual transition, we apply it to this object
  // if this is a theoretical transition, we apply it to a copy
  if(!actual)
    subgraph = subgraph.copy();

  // validate transitions
  if(!transitions.every(function(t) {
    var v = subgraph.vertices[t.vertex_id];
    if(v) {
      // if a transition hasn't been specified, there is nothing to do
      if(!(t.replace || t.combine))
        return false;

      var d = v.idea.data();
      // if there is no data, there is nothing to change
      if(Object.keys(d).length === 0)
        return false;
      v.data = d;

      if(t.replace) {
        if(v.data.unit !== t.replace.unit)
          return false;
      } else {
        if(v.data.unit !== t.combine.unit || !number.isNumber(v.data) || !number.isNumber(t.combine))
          return false;
      }

      return true;
    }
    return false;
  })) return undefined;

  // apply transitions
  transitions.forEach(function(t) {
    var v = subgraph.vertices[t.vertex_id];

    if(t.replace) {
      _.merge(v.data, t.replace);
    } else {
      _.merge(v.data, number.combine(v.data, t.combine));
    }

    if(actual)
      v.idea.update(v.data);
  });

  return subgraph;
}; // end rewrite
