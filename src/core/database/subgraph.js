'use strict';
var _ = require('lodash');
var ideas = require('./ideas');
var links = require('./links');
var discrete = require('../planning/primitives/discrete');

// this import needs to be a different name because we have exports.matcher.number
// we want to keep the API standard, so we can change the import in this file
var numnum = require('../planning/primitives/number');

// this is an overlay on the idea database
// it is a proxy or wrapper around the idea graph
// it's main purpose is to find a subgraph within the larger database
//
// you define the shape the graph you want to find, each node has it's own matcher

function Subgraph() {
  this.vertices = [];
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
  this.vertices.forEach(function(v) {
    var copy = _.clone(v);
    sg.vertices[v.vertex_id] = copy;

    // we need to copy the current state
    // (we can't just reload the data from idea)
    copy._data = _.cloneDeep(v._data);

    Object.defineProperty(copy, 'data', {
      get: function() { return loadVertexData(copy); },
      set: function(value) { copy._data = value; },
    });
  });
  this.edges.forEach(function(e) {
    sg.addEdge(e.src.vertex_id, e.link, e.dst.vertex_id, e.pref);
  });
  sg.concrete = this.concrete;
  return sg;
};
// @param matcher: exports.matcher or equivalent
// @param matchData: passed to the matcher
// @param transitionable: is this part of a transition (subgraph.rewrite, blueprints, etc)
//  - subgraph.rewrite(transitions);
Subgraph.prototype.addVertex = function(matcher, matchData, transitionable) {
  var id = this.vertices.length;
  var v = this.vertices[id] = {
    vertex_id: id,

    // this is how we are going to match an idea in the search and match
    matches: matcher,
    matchData: matchData,
    transitionable: (transitionable === true),

    // this is what we are ultimately trying to find with a subgraph search
    idea: undefined,

    // this is for the rewrite
    // if undefined, it hasn't be fetched
    // otherwise, it's the value of idea.data() before we tried to change it
    _data: undefined,
  };
  Object.defineProperty(v, 'data', {
    get: function() { return loadVertexData(v); },
    set: function(value) { v._data = value; },
  });

  if(matcher === exports.matcher.id) {
    v.matchData = (matchData.id || matchData);
    this.vertices[id].idea = ideas.proxy(matchData);
  } else {
    this.concrete = false;

    if(matcher === exports.matcher.number)
      // should this fail if it is not a number?
      numnum.isNumber(matchData);
  }

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

// returns undefined if there is no data, or the object if there is
function loadVertexData(v) {
  if(v._data === null) {
    return undefined;
  } else if(v._data !== undefined) {
    return v._data;
  } else if(v.idea === undefined) {
    return undefined;
  } else {
    // try loading the data
    var d = v.idea.data();
    if(Object.keys(d).length === 0) {
      // cach the result
      v._data = null;
      return undefined;
    } else {
      v._data = d;
      return v._data;
    }
  }
}

exports.Subgraph = Subgraph;


// matchers
// because of serialization, you currently cannot add your own
// because of serialization, the functions are create with a name
// ( e.g. id: function id() {})
exports.matcher = {
  id: function id(idea, matchData) {
    // XXX this could be an empty object
    return matchData === idea.id;
  },
  filler: function filler() {
    return true;
  },

  exact: function exact(idea, matchData) {
    return _.isEqual(idea.data(), matchData);
  },
  similar: function similar(idea, matchData) {
    // FIXME this implementation is bad and I should feel bad
    // matchData should be contained within data
    var data = idea.data();
    return _.isEqual(data, _.merge(_.cloneDeep(data), matchData));
  },
  number: function number(idea, matchData) {
    var data = idea.data();
    return numnum.difference(data, matchData) === 0;
  },
};

// serialize a subgraph object
// a straight JSON.stringify will not work
// we need to convert some objects and methods into a static mode that we can recover later
exports.stringify = function(sg) {
  // create a clone so we can modify it in place
  sg = sg.copy();

  // convert the verticies
  // _.map will flatten it into an array, but we store the id anyway
  sg.vertices = sg.vertices.map(function(v) {
    v.matches = v.matches.name;
    if(v.idea)
      v.idea = v.idea.id;
    return v;
  });

  sg.edges = sg.edges.map(function(e) {
    e.src = e.src.vertex_id;
    e.link = e.link.name;
    e.dst = e.dst.vertex_id;
    return e;
  });

  return JSON.stringify(sg);
};
// deserialize a subgraph object
// we need to explode the references that were collapsed into static data
exports.parse = function(str) {
  str = JSON.parse(str);
  var sg = new Subgraph();

  str.vertices.forEach(function(v) {
    // XXX swap the vertex ID
    // - or convert the vertices object to a list
    var id = sg.addVertex(exports.matcher[v.matches], v.matchData, v.transitionable);
    if(v.idea)
      sg.vertices[id].idea = ideas.proxy(v.idea);
    sg.vertices[id]._data = v._data;
  });

  str.edges.forEach(function(e) {
    sg.addEdge(e.src, links.list[e.link], e.dst, e.pref);
  });

  sg.concrete = str.concrete;

  return sg;
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
    if(!subgraph.vertices.every(function(v) {
      if(v.idea) return true;
      return false;
    }))
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
// @param unitOnly is specific to transitionable vertices and blueprint.tryTransition
// - when we need to see if a transition is possible, the match needs to see if we can combine the values
// - this boils down to "do the units match"
// AC: subgraph.match: i.transitionable === o.transitionable
exports.match = function(subgraphOuter, subgraphInner, unitOnly) {
  if(!subgraphOuter.concrete)
    throw new RangeError('the outer subgraph must be concrete before you can match against it');

  // if there are no vertices, return nothing
  var numVertices = subgraphInner.vertices.length;
  if(numVertices === 0)
    return [];

  unitOnly = (unitOnly === true);

  // pre-fill a vertex map with identified thoughts
  var vertexMap = {};
  var possible = true;
  _.forEach(subgraphInner.vertices, function(vi) {
    if(vi.idea) {
      _.forEach(subgraphOuter.vertices, function(vo) {
        // outer is concrete; vo.idea exists
        if(vi.idea.id === vo.idea.id) {
          vertexMap[vi.vertex_id] = vo.vertex_id;
          possible = vertexTransitionableAcceptable(vo, vi, unitOnly);
        }
        return possible;
      });
    }
    return possible;
  });

  if(!possible)
    return [];

  // if there are no edges, return the map
  if(subgraphInner.edges.length === 0) {
    if(Object.keys(vertexMap).length === numVertices)
      return [vertexMap];
    return [];
  }

  // with this information, fill out the map using the edges
  // (note: there may not yet be any edges specified)
  return subgraphMatch(_.clone(subgraphOuter.edges), _.clone(subgraphInner.edges), vertexMap, unitOnly)
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
function subgraphMatch(outerEdges, innerEdges, vertexMap, unitOnly) {
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

    // check the transitionability of both src and dst
    if(!vertexTransitionableAcceptable(currEdge.src, innerEdge.src, unitOnly))
      return false;
    if(!vertexTransitionableAcceptable(currEdge.dst, innerEdge.dst, unitOnly))
      return false;

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
      return subgraphMatch(newOuter, newInner, newMap, unitOnly);
  }).reduce(function(list, match) {
    // reduce all match lists into a single list
    Array.prototype.push.apply(list, match);
    return list;
  }, []);
} // end subgraphMatch

function vertexTransitionableAcceptable(vo, vi, unitOnly) {
  if(vi.transitionable !== vo.transitionable) {
    // if one is transitionable, they both must be transitionable
    return false;
  } else if(vi.transitionable) {
    // if they are both transitionable, then the values must match
    // XXX maybe make this more complicate to account for non-unit transitionable data
    // - but where is the use case?
    // - and then what do we use as our rough estimate
    // - (the value doesn't match, but we CAN transition)
    // - (if it doesn't have a unit, what other fuzzy matching would we perform)
    // - (if it doesn't have a unit, what what's the point of unitOnly?)
    if(vo.data && vo.data.unit && vi.data && vi.data.unit) {
      if(unitOnly && vo.data.unit !== vi.data.unit)
        return false;

      if(!unitOnly && numnum.difference(vo.data, vi.data) !== 0 && discrete.difference(vo.data, vi.data) !== 0)
        return false;
    }
  }
  return true;
}


// @param transitions: an array of transitions
//  - { vertex_id: id, replace: number }
//  - { vertex_id: id, combine: number }
//  - { vertex_id: id, replace: discrete }
//  - { vertex_id: id, replace_id: id } // (both are vertex_id's)
//  - AC: actuator.runBlueprint depends on this structure
//  - AC: actuator.runBlueprint does a _.clone() on each object, and replaces vertex_id
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
      if(!(t.replace || t.combine || t.replace_id))
        return false;

      if(!v.transitionable) {
        console.log('cannot rewrite; v is not transitionable');
        return false;
      }

      // if there is no data, then there is nothing to transition
      if(v.data === undefined)
        return false;

      // verify the transition data
      if(t.replace) {
        if(v.data.unit && t.replace.unit && v.data.unit !== t.replace.unit)
          return false;
      } else if(t.replace_id) {
        var r = subgraph.vertices[t.replace_id];
        if(v.data.unit && r.data.unit && v.data.unit !== r.data.unit)
          return false;
      } else {
        if(v.data.unit !== t.combine.unit || !numnum.isNumber(v.data) || !numnum.isNumber(t.combine))
          return false;
      }

      return true;
    }
    return false;
  })) return undefined; // if not all of the transitions are correct, return undefined

  // apply transitions
  transitions.forEach(function(t) {
    var v = subgraph.vertices[t.vertex_id];

    if(t.replace) {
      v.data = t.replace;
    } else if(t.replace_id) {
      v.data = subgraph.vertices[t.replace_id].data;
    } else {
      v.data = numnum.combine(v.data, t.combine);
    }

    if(actual)
      // FIXME should combine use "update?" or should I perform a combine on the raw
      // - do I need to guarantee that v.data and v.idea.data() before combine have a number.difference of 0
      // - more strictly, should they be _.isEqual?
      v.idea.update(v.data);
  });

  return subgraph;
}; // end rewrite
