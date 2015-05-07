'use strict';
var _ = require('lodash');
var ideas = require('./ideas');
var links = require('./links');

// these imports need to be a different name because we have exports.matcher.discrete and exports.matcher.number
// we want to keep the API standard, so we can change the import in this file
var crtcrt = require('../planning/primitives/discrete');
var numnum = require('../planning/primitives/number');

// this is an overlay on the idea database
// it is a proxy or wrapper around the idea graph
// it's main purpose is to find a subgraph within the larger database
//
// you define the shape the graph you want to find, each node has it's own matcher
//
// there are three different stages to this subgraph
// each vertex contains data for these three stages
// but for the sake of efficiency, they are not stored together

function Subgraph() {
  // this is how we are going to match an idea in the search and match
  // this is the recipe, the way we determined if this vertex can be pinned to the world (or another subgraph)
  this._match = {};
  // this is what we are ultimately trying to find with a subgraph search
  // pinned context
  this._idea = {};
  // theoretical state
  // this is for the rewrite, planning in general
  // if undefined, it hasn't be fetched from idea.data()
  // set to null if there is no data (so we know not to query again)
  this._data = {};


  // how the vertices are linked together
  this._edges = [];


  // when we generate a new vertex, we need a new key
  this._vertexCount = 0;

  // true
  //   does this represent a specific subgraph
  //   all of the vertices have a specific ID
  // false
  //   is it a description of something to find
  // cache value for:
  //   sg._match.every(function(v, id) { return (id in sg._idea); })
  //   Object.keys(sg._match).deep.equals(Object.keys(sg._idea))
  this.concrete = true;


  // TODO remove these after testing with wumpus
  Object.defineProperty(this, 'vertices', {
    get: function() { throw new Error('vertices is deprecated'); },
    set: function() { throw new Error('uhm... crow?'); }
  });
  Object.defineProperty(this, 'invalidateCache', {
    get: function() { throw new Error('invalidateCache is deprecated'); },
    set: function() { throw new Error('uhm... crow?'); }
  });
}

// TODO can I do a lazy copy?
Subgraph.prototype.copy = function() {
  var sg = new Subgraph();

  // the match data and ideas should/will never change
  // so we can reference the original
  _.assign(sg._match, this._match);
  _.assign(sg._idea, this._idea);

  // the data can be updated in whole or in part
  // it's best to make a deep copy of this
  sg._data = _.cloneDeep(this._data);

  this._edges.forEach(function(e) {
    sg.addEdge(e.src, e.link, e.dst, e.pref);
  });

  sg._vertexCount = this._vertexCount;
  sg.concrete = this.concrete;

  return sg;
};

// add a vertex to the graph
// this only specifies match data
// the other parts (ideas / data) need to be found later
//
// @param matcher: exports.matcher or equivalent
// @param matchData: passed to the matcher
// // TODO should matchData be inside options?
// // - if(matcher !== filler && options.matchData === undefined) throw new Error('matchData must be defined');
// @param options: {
//   transitionable: boolean, // if true, this part of a transition (subgraph.rewrite, blueprints, etc; subgraph.rewrite(transitions);)
//                            // it means that we are intending to change the value
//   matchRef: boolean, // if true, this should use a different object for the matchData
//                      // specifically, use vertex[matchData].data instead of matchData
//                      // (it doesn't make sense to use this with matcher.filler)
// // TODO add support for matchRef in blueprints; look for any case where we use vertex.data
// }
Subgraph.prototype.addVertex = function(matcher, data, options) {
  options = _.merge({
    transitionable: false,
    matchRef: false
  }, options);

  if(options.matchRef && !(data in this._match))
    throw new Error('referred index (matchData) must already exist in the vertex list');

  var id = this._vertexCount + '';
  this._vertexCount++;

  this._match[id] = {
    matcher: matcher,
    data: data,
    options: options
  };

  if(matcher === exports.matcher.id) {
    this._match[id].data = (data.id || data);
    this._idea[id] = ideas.proxy(data);
  } else {
    this.concrete = false;

    if(!options.matchRef) {
      if (matcher === exports.matcher.number) {
        if(!numnum.isNumber(data))
          throw new Error('matcher.number using non-number');
      } else if(matcher === exports.matcher.discrete) {
        if(!crtcrt.isDiscrete(data))
          throw new Error('matcher.discrete using non-discrete');
      }
    }
  }

  return id;
};

// @param src: a vertex ID
// @param link: the link from src to dst
// @param dst: a vertex ID
// @param pref: higher prefs will be considered first (default: 0)
Subgraph.prototype.addEdge = function(src, link, dst, pref) {
  this._edges.push({
    src: src,
    link: link,
    dst: dst,
    pref: (pref || 0)
  });
  this.concrete = this.concrete && (this.getIdea(src) !== undefined) && (this.getIdea(dst) !== undefined);
};

Subgraph.prototype.getMatch = function(id) {
  return this._match[id];
};

Subgraph.prototype.getIdea = function(id) {
  return this._idea[id];
};
Subgraph.prototype.allIdeas = function() {
  return _.assign({}, this._idea);
};

// returns undefined if there is no data, or the object if there is
Subgraph.prototype.getData = function(id) {
  if(this._data[id] === null) {
    return undefined;
  } else if(this._data[id] !== undefined) {
    return this._data[id];
  } else if(this.getIdea(id) === undefined) {
    return undefined;
  } else {
    // try loading the data
    var value = this.getIdea(id).data();
    if(Object.keys(value).length === 0) {
      // cache the result
      this._data[id] = null;
      return undefined;
    } else {
      this._data[id] = value;
      return value;
    }
  }
};
Subgraph.prototype.setData = function(id, value) {
  this._data[id] = value;
};
Subgraph.prototype.deleteData = function() {
  if(arguments.length) {
    // only reset the ones in the arguments
    var sg = this;
    _.forEach(arguments, function(id) {
      delete sg._data[id];
    });
  } else {
    // reset all vertices
    this._data = {};
  }
};

exports.Subgraph = Subgraph;


// matchers
// because of serialization, you currently cannot add your own
// - we can probably add them to this list directly, so long as we add them on startup (and they are simple)
// because of serialization, the functions are create with a name
// ( e.g. id: function id() {})
//
// AC: matcher.number(sg, id, matchData)
// - when working with inconcrete graphs in subgraph.match
// - we need to work with the hypothetical data (sg.getData(id))
//
exports.matcher = {
  id: function id(idea, matchData) {
    // XXX this could be an empty object
    return matchData === idea.id;
  },
  filler: function filler() {
    return true;
  },

  exact: function exact(data, matchData) {
    return _.isEqual(data, matchData);
  },
  similar: function similar(data, matchData) {
    // matchData should be contained within data
    return _.isEqual(data, _.merge(_.cloneDeep(data), matchData));
  },
  number: function number(data, matchData) {
    return numnum.difference(data, matchData) === 0;
  },
  discrete: function discrete(data, matchData) {
    return crtcrt.difference(data, matchData) === 0;
  }
};

// serialize a subgraph object
// a straight JSON.stringify will not work
// we need to convert some objects and methods into a static mode that we can recover later
// @param dump: output more data (not meant to be saved); this is useful for visualization
exports.stringify = function(sg, dump) {
  return JSON.stringify({
    match: _.reduce(sg._match, function(result, value, key) {
      result[key] = {
        matcher: value.matcher.name,
        data: value.data,
        options: value.options
      };
      return result;
    }, {}),
    idea: _.reduce(sg.allIdeas(), function(result, value, key) {
      result[key] = value.id;
      return result;
    }, {}),
    data: ((dump===true)?_.reduce(sg._match, function(result, ignore, key) {
      if(sg._data[key]) {
        result[key] = sg._data[key];
      } else if(sg.getIdea(key)) {
        result[key] = sg.getIdea(key).data();
      }
      return result;
    }, {}):sg._data),

    edges: _.map(sg._edges, function(value) {
      return {
        src: value.src,
        link: value.link.name,
        dst: value.dst,
        pref: value.pref
      };
    }),

    vertexCount: sg._vertexCount,
    concrete: sg.concrete
  });
};
// deserialize a subgraph object
// we need to explode the references that were collapsed into static data
exports.parse = function(str) {
  str = JSON.parse(str);
  var sg = new Subgraph();

  _.forEach(str.match, function(value, key) {
    var data = value.data;
    if (value.matcher === exports.matcher.number.name) {
      numnum.isNumber(data);
    } else if(value.matcher === exports.matcher.discrete.name) {
      crtcrt.isDiscrete(data);
    }
    sg._match[key] = {
      matcher: exports.matcher[value.matcher],
      data: data,
      options: value.options
    };
  });

  _.forEach(str.idea, function(value, key) {
    sg._idea[key] = ideas.proxy(value);
  });

  sg._data = str._data || sg._data;

  _.forEach(str.edges, function(e) {
    sg.addEdge(e.src, links.list[e.link], e.dst, e.pref);
  });

  sg._vertexCount = str.vertexCount;
  sg.concrete = str.concrete;

  return sg;
};


// find a list of subgraphs in the database that matches the supplied subgraph
// TODO don't modify the original
// - this may break some tests/use cases, so check for every call to search
//
// use Prim's algorithm to expand the known subgraph
// we are trying to identify all of the vertices
// we use edges to find new ones
exports.search = function(subgraph) {
  if(subgraph.concrete)
    return [subgraph];

  var selectedEdge;
  var selectedBranches;
  var nextSteps = [];

  // find an edge to expand
  if(!subgraph._edges.every(function(currEdge) {
    var srcIdea = subgraph.getIdea(currEdge.src);
    var dstIdea = subgraph.getIdea(currEdge.dst);
    var isSrc = (srcIdea !== undefined);
    var isDst = (dstIdea !== undefined);

    if(isSrc ^ isDst) {
      var srcMatch = subgraph.getMatch(currEdge.src);
      var dstMatch = subgraph.getMatch(currEdge.dst);

      // we can't consider this edge if the target object hasn't be identified
      // return true because this doesn't make the match invalid
      if(isSrc && dstMatch.options.matchRef && subgraph.getIdea(dstMatch.data) === undefined)
        return true;
      if(isDst && srcMatch.options.matchRef && subgraph.getIdea(srcMatch.data) === undefined)
        return true;

      var currBranches = (isSrc ? (srcIdea.link(currEdge.link)) : (dstIdea.link(currEdge.link.opposite)) );

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
      if(!srcIdea.link(currEdge.link).some(function(idea) { return idea.id === dstIdea.id; }))
        // if we can't resolve this edge, then this graph is invalid
        return false;
    }

    return true;
  })) return []; // end if !edges.every

  // expand the edge
  if(selectedEdge && selectedBranches) {
    // pick the vertex to expand
    var vertex_id = (subgraph.getIdea(selectedEdge.src) === undefined) ? selectedEdge.src : selectedEdge.dst;
    var match = subgraph.getMatch(vertex_id);
    var matchData = match.options.matchRef?subgraph.getData(match.data):match.data;

    // XXX following the transitions to the end requires a more complex pre match thing
//    var matchData = vertex.matchData;
//    if(vertex.options.matchRef) {
//      var tv = vertex;
//      while(tv.options.matchRef)
//        tv = subgraph.vertices[tv.matchData];
//      matchData = tv.data;
//    }

    var matchedBranches = selectedBranches.filter(function(idea) {
      if(match.matcher === exports.matcher.id)
        // XXX this should never happen here
        return match.matcher(idea, matchData);
      else
        return match.matcher(idea.data(), matchData);
    });

    if(matchedBranches.length === 0) {
      return [];
    } else if(matchedBranches.length === 1) {
      // we can reuse subgraph at the next level
      subgraph._idea[vertex_id] = matchedBranches[0];
      nextSteps.push(subgraph);
    } else {
      // we need to branch; create a new subgraph instance for each level
      matchedBranches.forEach(function(idea) {
        var sg = subgraph.copy();
        sg._idea[vertex_id] = idea;
        nextSteps.push(sg);
      });
    }
  }

  // recurse
  // there are no edges that can be expanded
  if(nextSteps.length === 0) {
    // check all vertices to ensure they all have ideas defined
    if(subgraph._vertexCount !== Object.keys(subgraph._idea).length)
      return [];

//    if(!subgraph.edges.every(function(edge) { return edge.src.idea && edge.dst.idea; }))
//      return [];

    subgraph.concrete = true;
    return [ subgraph ];
  } else {
    // do the next iteration of searches
    return nextSteps.reduce(function(ret, sg) {
      Array.prototype.push.apply(ret, exports.search(sg));
      return ret;
    }, []);
  }

}; // end exports.search

// use subgraphOuter as a base
// does subgraphInner fit inside of subgraphOuter?
// (basically a subgraph match on two subgraphs)
// @param unitOnly is specific to transitionable vertices and blueprint.tryTransition
// - when we need to see if a transition is possible, the match needs to see if we can combine the values
// - this boils down to "do the units match"
// AC: subgraph.match: i.options.transitionable === o.options.transitionable
//
// TODO problem with combinatorics
// - is it okay just know there is an answer, or to think there may be one?
// - 1 known root with 10 fillers. that's 10! options
// - we don't need to list every option
// - but what can we do about it? what would this even look like?
// - can we try one solution, and start to nail down likely version
//   (pin down, say, 6, and then try all 4! remaining options)
exports.match = function(subgraphOuter, subgraphInner, unitOnly) {
  if(!subgraphOuter.concrete)
    throw new RangeError('the outer subgraph must be concrete before you can match against it');

  // if there are no vertices, return nothing
  if(subgraphInner._vertexCount === 0)
    return [];

  unitOnly = (unitOnly === true);

  // pre-fill a vertex map with identified thoughts
  // TODO build a reverse map (outer.idea.id -> outer.vertex_id), then loop over inner.idea
  var vertexMap = {};
  var possible = true;
  _.forEach(subgraphInner.allIdeas(), function(vi_idea, vi_key) {
    _.forEach(subgraphOuter.allIdeas(), function(vo_idea, vo_key) {
      // outer is concrete; vo.idea exists
      if(vi_idea.id === vo_idea.id) {
        vertexMap[vi_key] = vo_key;
        // vi.idea has been identified
        // so we can use vi.data directly
        possible = vertexTransitionableAcceptable(
          subgraphOuter.getMatch(vo_key).options.transitionable,
          subgraphOuter.getData(vo_key),
          subgraphInner.getMatch(vi_key).options.transitionable,
          subgraphInner.getData(vi_key),
          unitOnly);
      }
      return possible;
    });
    return possible;
  });

  if(!possible)
    return [];

  // if there are no edges, return the map
  if(subgraphInner._edges.length === 0) {
    // if there are edges, and all vertices have been mapped, we still need to check the edges to make sure they match
    // or we can just make the call to subgraphMatch
    // TODO do we need to run the matchers? we probably need to run the matchers
    // TODO what does it mean to call subgraph.match with inner.concrete? is this really targeted for !inner.concrete?
    // - they probably both make sense, but they are distinctly different operations
    if(Object.keys(vertexMap).length === subgraphInner._vertexCount)
      return [vertexMap];
    return [];
  }

  // with this information, fill out the map using the edges
  // (note: there may not yet be any edges specified)
  return subgraphMatch(subgraphOuter, subgraphInner, _.clone(subgraphOuter._edges), _.clone(subgraphInner._edges), vertexMap, unitOnly, [])
    .filter(function(map) {
      return Object.keys(map).length === subgraphInner._vertexCount;
    });
}; // end exports.match

// okay, so this is actually the function that does the matching
// (subgraphMatch is the recursive case, exports.match is the seed case)
//
// map[inner.vertex_id] = outer.vertex_id;
// we will typically use the inner subgraph to find the indices of the outer map
// match all of the innerEdges to the outerEdges
function subgraphMatch(subgraphOuter, subgraphInner, outerEdges, innerEdges, vertexMap, unitOnly, skipThisTime) {
  // pick the best inner edge
  // (this should help us reduce the number of branches)
  var innerEdge = innerEdges.reduce(function(prev, curr) {
    if(prev === null || curr.pref > prev.pref && skipThisTime.indexOf(curr) === -1)
      return curr;
    return prev;
  }, null);
  innerEdges.splice(innerEdges.indexOf(innerEdge), 1);

  var srcMapped = (innerEdge.src in vertexMap);
  var dstMapped = (innerEdge.dst in vertexMap);
  var inverseMap = _.invert(vertexMap);
  var innerSrcMatch = subgraphInner.getMatch(innerEdge.src);
  var innerDstMatch = subgraphInner.getMatch(innerEdge.dst);

  // find all matching outer edges
  var matches = outerEdges.filter(function(currEdge) {
    if(innerEdge.link === currEdge.link.opposite) {
      // reverse edge
      currEdge = {
        src: currEdge.dst,
        link: currEdge.link.opposite,
        dst: currEdge.src
      };
    } else if(innerEdge.link !== currEdge.link)
      // the edges don't match
      return false;

    // skip the vertices that are mapped to something different
    if(srcMapped) {
      if(vertexMap[innerEdge.src] !== currEdge.src)
        return false;
    } else {
      // currEdge src is mapped to a different inner id
      if(currEdge.src in inverseMap)
        return false;
    }
    if(dstMapped) {
      if(vertexMap[innerEdge.dst] !== currEdge.dst)
        return false;
    } else {
      // currEdge dst is mapped to a different inner id
      if(currEdge.dst in inverseMap)
        return false;
    }

    // find the target data we are interested
    var srcData;
    if(subgraphInner.getIdea(innerEdge.src) || !innerSrcMatch.options.matchRef) {
      // this is pretty simple for for !matchRef
      // or if the target is already associated with an idea
      srcData = subgraphInner.getData(innerEdge.src);
    } else {
      // if our inner graph has a value cached, use that
      srcData = subgraphInner.getData(innerSrcMatch.data);

      if(!srcData) {
        // if we have already mapped the vertex in question (the matchRef target; match.data), then use the outer data
        // (mapped, but the inner hasn't been updated with the idea)
        // (note: we may not have mapped the matchRef target by this point, and that's okay)
        if(innerSrcMatch.data in vertexMap) {
          srcData = subgraphOuter.getData(vertexMap[innerSrcMatch.data]);
        } else {
          // if we can't find srcData to use, then we can't check this edge yet
          return false;
        }
      }
    }
    var dstData;
    if(subgraphInner.getIdea(innerEdge.dst) || !innerDstMatch.options.matchRef) {
      // this is pretty simple for for !matchRef
      // or if the target is already associated with an idea
      dstData = subgraphInner.getData(innerEdge.dst);
    } else {
      // if our inner graph has a value cached, use that
      dstData = subgraphOuter.getData(innerDstMatch.data);

      if(!dstData) {
        // if we have already mapped the vertex in question (the matchRef target; match.data), then use the outer data
        // (mapped, but the inner hasn't been updated with the idea)
        // (note: we may not have mapped the matchRef target by this point, and that's okay)
        if(innerDstMatch.data in vertexMap) {
          dstData = subgraphOuter.getData(vertexMap[innerDstMatch.data]);
        } else {
          // if we can't find dstData to use, then we can't check this edge yet
          return false;
        }
      }
    }

    // check the transitionability of both src and dst
    if(!vertexTransitionableAcceptable(
        subgraphOuter.getMatch(currEdge.src).options.transitionable,
        subgraphOuter.getData(currEdge.src),
        innerSrcMatch.options.transitionable,
        srcData,
        unitOnly))
      return false;
    if(!vertexTransitionableAcceptable(
        subgraphOuter.getMatch(currEdge.dst).options.transitionable,
        subgraphOuter.getData(currEdge.dst),
        innerDstMatch.options.transitionable,
        dstData,
        unitOnly))
      return false;

    // if matchRef, then we want to use the data we found as the matcher data
    // if !matchRef, then we need to use the matchData on the object
    if(!unitOnly || !innerSrcMatch.options.transitionable) {
      if(!innerSrcMatch.options.matchRef)
        srcData = innerSrcMatch.data;

      var outerSrcData;
      if(innerSrcMatch.matcher === exports.matcher.id)
        outerSrcData = subgraphOuter.getIdea(currEdge.src);
      else
        outerSrcData = subgraphOuter.getData(currEdge.src);

      if(!innerSrcMatch.matcher(outerSrcData, srcData))
        return false;
    }
    if(!unitOnly || !innerDstMatch.options.transitionable) {
      if (!innerDstMatch.options.matchRef)
        dstData = innerDstMatch.data;

      var outerDstData;
      if(innerDstMatch.matcher === exports.matcher.id)
        outerDstData = subgraphOuter.getIdea(currEdge.dst);
      else
        outerDstData = subgraphOuter.getData(currEdge.dst);

      if(!innerDstMatch.matcher(outerDstData, dstData))
        return false;
    }

    return true;
  });

  // recurse (on picking matchRef too soon)
  if(matches.length === 0) {
    // because of indirection, we may need to skip an edge and try the next best one
    // so if our current edge uses inderection, and there are other edges to try, then, well, try again
    // but next time, don't consider this edge
    if((innerSrcMatch.options.matchRef || innerDstMatch.options.matchRef) && innerEdges.length > skipThisTime.length) {
      innerEdges.push(innerEdge);
      skipThisTime.push(innerEdge);
      return subgraphMatch(subgraphOuter, subgraphInner, outerEdges, innerEdges, vertexMap, unitOnly, skipThisTime);
    }

    // no matches, and we've skipped everything
    return [];
  }

  // recurse (standard)
  return matches.map(function(outerEdge) {
    // update the new matches
    var newMap = _.clone(vertexMap);
    if(outerEdge.link === innerEdge.link) {
      newMap[innerEdge.src] = outerEdge.src;
      newMap[innerEdge.dst] = outerEdge.dst;
    } else { // outerEdge.link === innerEdge.link.opposite
      newMap[innerEdge.src] = outerEdge.dst;
      newMap[innerEdge.dst] = outerEdge.src;
    }

    // shallow copy the outer/inner without the current match
    var newOuter = outerEdges.filter(function(e) { return e !== outerEdge; });
    var newInner = innerEdges.filter(function(e) { return e !== innerEdge; });

    if(newInner.length === 0)
      // base case
      // if there are no more inner edges to match, then our vertex map is complete
      return [newMap];
    else
      // recursive case
      // get a list of all matches from this branch
      return subgraphMatch(subgraphOuter, subgraphInner, newOuter, newInner, newMap, unitOnly, []);
  }).reduce(function(list, match) {
    // reduce all match lists into a single list
    Array.prototype.push.apply(list, match);
    return list;
  }, []);
} // end subgraphMatch

// AC: if vi.options.transitionable === false, we don't care what vo.options.transitionable is
// - we only need to care about transitions if vi wants it
function vertexTransitionableAcceptable(vo_transitionable, vo_data, vi_transitionable, vi_data, unitOnly) {
  if(vi_transitionable) {
    if(!vo_transitionable)
      return false;

    // if they are both transitionable, then the values must match
    // XXX maybe make this more complicate to account for non-unit transitionable data
    // - but where is the use case?
    // - and then what do we use as our rough estimate
    // - (the value doesn't match, but we CAN transition)
    // - (if it doesn't have a unit, what other fuzzy matching would we perform)
    // - (if it doesn't have a unit, what what's the point of unitOnly?)
    if(vo_data && vo_data.unit && vi_data && vi_data.unit) {
      if(unitOnly && vo_data.unit !== vi_data.unit)
        return false;

      if(!unitOnly && numnum.difference(vo_data, vi_data) !== 0 && crtcrt.difference(vo_data, vi_data) !== 0)
        return false;
    }
  }
  return true;
}


// @param transitions: an array of transitions
//  - { vertex_id: id, replace: number }
//  - { vertex_id: id, combine: number }
//  - { vertex_id: id, replace: discrete }
//  - { vertex_id: id, cycle: { value: number, unit: idea.id } }
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
  // if there are no transitions, then this action doesn't make sense
  // we could just return subgraph, but that may be confusing
  if(transitions.length === 0)
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
      if(!(t.replace || t.combine || t.hasOwnProperty('replace_id') || t.cycle))
        return false;

      if(!v.match.options.transitionable) {
        return false;
      }

      // if there is no data, then there is nothing to transition
      if(v.data === undefined)
        return false;

      // verify the transition data
      if(t.replace) {
        if(v.data.unit && t.replace.unit && v.data.unit !== t.replace.unit)
          return false;
      } else if(t.hasOwnProperty('replace_id')) {
        var r = subgraph.vertices[t.replace_id];
        if(v.data.unit && r.data.unit && v.data.unit !== r.data.unit)
          return false;
      } else if(t.cycle) {
        // TODO does the discrete unit need to be defined as 'cyclical' before we can use 'cycle'
        if(v.data.unit !== t.cycle.unit || !crtcrt.isDiscrete(v.data))
          return false;
      } else { // if(t.combine) {
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
    } else if(t.hasOwnProperty('replace_id')) {
      v.data = subgraph.vertices[t.replace_id].data;
    } else if(t.cycle) {
      var states = ideas.load(v.data.unit).data().states;
      var idx = states.indexOf(v.data.value)+t.cycle.value;
      idx = (((idx%states.length)+states.length)%states.length);
      v.data.value = states[idx];
    } else { // if(t.combine) {
      v.data = numnum.combine(v.data, t.combine);
    }

    if(actual)
      // XXX should combine use "update?" or should I perform a combine on the raw
      // - number.combine(v.idea.data(), t.combine)
      // - should number.difference(v.data, v.idea.data()) === 0 before combine?
      // - should _.isEqual(v.data, v.idea.data()) before combine?
      v.idea.update(v.data);
  });

  return subgraph;
}; // end rewrite
