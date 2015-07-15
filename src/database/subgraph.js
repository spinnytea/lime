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
  // do a lazy copy of match data
  // don't copy the data if we don't need to
  this._matchParent = undefined;

  // this is what we are ultimately trying to find with a subgraph search
  // pinned context
  this._idea = {};

  // theoretical state
  // this is for the rewrite, planning in general
  // if undefined, it hasn't be fetched from idea.data()
  // set to null if there is no data (so we know not to query again)
  this._data = {};
  // do a lazy copy of cache data
  // don't copy the data if we don't need to
  this._dataParent = undefined;


  // how the vertices are linked together
  this._edges = [];


  // when we generate a new vertex, we need a new key
  // we also want fast access to the number of vertices we have
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
}

Subgraph.prototype.copy = function() {
  var sg = new Subgraph();

  // if there is locally defined match data
  // then put it in a parent object
  // make that a parent of this
  if(!_.isEmpty(this._match)) {
    this._matchParent = {
      obj: this._match,
      parent: this._matchParent
    };
    this._match = {};
  }
  // defined or undefined, we need to pass the parent to the copy
  sg._matchParent = this._matchParent;
  // both this._match and sg._match will be empty

  // the match data and ideas should/will never change
  // so we can reference the original
  _.assign(sg._idea, this._idea);

  // if there is locally defined cache data
  // then put it in a parent object
  // make that a parent of this
  if(!_.isEmpty(this._data)) {
    this._dataParent = {
      obj: this._data,
      parent: this._dataParent
    };
    this._data = {};
  }
  // defined or undefined, we need to pass the parent to the copy
  sg._dataParent = this._dataParent;
  // both this._data and sg._data will be empty

  sg._edges = _.clone(this._edges);

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

  if(!matcher || matcher !== exports.matcher[matcher.name])
    throw new RangeError('invalid matcher');
  if(options.matchRef && this.getMatch(data) === undefined)
    throw new RangeError('matchRef target (match.data) must already be a vertex');

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

  var srcIdea = this.getIdea(src);
  if(srcIdea) {
    var dstIdea = this.getIdea(dst);
    if(dstIdea) {
      // both ideas are defined
      // so we need to see if the edge fits this definition
      if(!srcIdea.link(link).some(function(idea) { return idea.id === dstIdea.id; })) {
        // if the edge doesn't match, then this is no longer concrete and these edges don't match
        // the rest of the graph is fine, this section is invalid
        this.deleteIdea(src);
        this.deleteIdea(dst);
        this.concrete = false;
      }
    }
  }
  // if only one of the vertices has an idea, then
  // - this.concrete is already false
  // - there is no idea to check for a match, anyway
};

Subgraph.prototype.getMatch = function(id) {
  if(id in this._match)
    return this._match[id];

  // use case micro optimizations
  // this will USUALLY be 0 or 1 layers deep
  if(!this._matchParent)
    return undefined;
  var parent = this._matchParent;
  if(parent.parent === undefined)
    return parent.obj[id];

  return searchParent(id, parent);
};

Subgraph.prototype.getIdea = function(id) {
  return this._idea[id];
};
Subgraph.prototype.allIdeas = function() {
  return _.assign({}, this._idea);
};
Subgraph.prototype.deleteIdea = function(id) {
  if(id in this._idea) {
    delete this._idea[id];
    this.concrete = false;
  }
};

// returns undefined if there is no data, or the object if there is
Subgraph.prototype.getData = function(id) {
  var data;

  if(id in this._data)
    data = this._data[id];
  else
    data = searchParent(id, this._dataParent);

  if(data === null) {
    return undefined;
  } else if(data !== undefined) {
    return data;
  } else if(this.getIdea(id) === undefined) {
    return undefined;
  } else {
    // try loading the data
    var value = this.getIdea(id).data();
    if(_.isEmpty(value)) {
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
      sg._data[id] = undefined;
    });
  } else {
    // reset all vertices
    this._data = {};
    this._dataParent = undefined;
  }
};

exports.Subgraph = Subgraph;


function forAllVertices(sg, callback) {
  for(var i=0; i<sg._vertexCount; i++)
    callback(i+'');
}
function searchParent(id, parent) {
  while(parent) {
    if(id in parent.obj)
      return parent.obj[id];
    parent = parent.parent;
  }
  return undefined;
}
function acrossParents(parent, callback) {
  while(parent) {
    _.forEach(parent.obj, callback);
    parent = parent.parent;
  }
}


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
  var match = {};
  forAllVertices(sg, function(id) {
    var value = sg.getMatch(id);
    match[id] = {
      matcher: value.matcher.name,
      data: value.data,
      options: value.options
    };
  });

  var data = _.clone(sg._data);
  acrossParents(sg._dataParent, function(value, id) {
    if(!(id in data))
      data[id] = value;
  });
  if(dump === true) {
    forAllVertices(sg, function(id) {
      if(data[id] === undefined) {
        var idea = sg.getIdea(id);
        if(idea) {
          var value = idea.data();

          if(_.isEmpty(value))
            data[id] = null;
          else
            data[id] = value;
        }
      }
    });
  }

  return JSON.stringify({
    match: match,
    idea: _.reduce(sg.allIdeas(), function(result, value, key) {
      result[key] = value.id;
      return result;
    }, {}),
    data: data,

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
    if (!value.options.matchRef) {
      if (value.matcher === exports.matcher.number.name) {
        numnum.isNumber(value.data);
      } else if (value.matcher === exports.matcher.discrete.name) {
        crtcrt.isDiscrete(value.data);
      }
    }
    sg._match[key] = {
      matcher: exports.matcher[value.matcher],
      data: value.data,
      options: value.options
    };
  });

  _.forEach(str.idea, function(value, key) {
    sg._idea[key] = ideas.proxy(value);
  });

  sg._data = str.data;

  _.forEach(str.edges, function(e) {
    sg.addEdge(e.src, links.list[e.link], e.dst, e.pref);
  });

  sg._vertexCount = str.vertexCount;
  sg.concrete = str.concrete;

  return sg;
};


exports.search = require('./subgraph/search');

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
  var vertexMap = {};
  // build a reverse map (outer.idea.id -> outer.vertex_id)
  // this way we only need to loop over the outer ideas once (it can get large)
  // this makes it O(ni*log(no)), instead of O(ni*no)
  var inverseOuterMap = _.reduce(subgraphOuter.allIdeas(), function(map, vo_idea, vo_key) {
    map[vo_idea.id] = vo_key;
    return map;
  }, {});
  // if the match is not possible, then exit early and return []
  var possible = true;

  _.forEach(subgraphInner.allIdeas(), function(vi_idea, vi_key) {
    var vo_key = inverseOuterMap[vi_idea.id];
    if(vo_key) {
      vertexMap[vi_key] = vo_key;
      // vi.idea has been identified
      // so we can use vi.data directly
      possible = vertexTransitionableAcceptable(
        subgraphOuter.getMatch(vo_key).options.transitionable,
        subgraphOuter.getData(vo_key),
        subgraphInner.getMatch(vi_key).options.transitionable,
        subgraphInner.getData(vi_key),
        unitOnly);

      // TODO update this section with the stuff below vertexTransitionableAcceptable in subgraphMatch
    }
    return possible;
  });

  if(!possible)
    return [];

  // if there are no edges, return the map
  // XXX if the inner is concrete, and all the vertices match, then we will ignore the edges
  // - should we make sure all the inner edges have an outer edge?
  // - this is needed for when we actuator.scheduleBlueprint, and rewrite the goal
  if(subgraphInner._edges.length === 0 || subgraphInner.concrete) {
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
      dstData = subgraphInner.getData(innerDstMatch.data);

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

exports.rewrite = require('./subgraph/rewrite');

// inner and outer have already been subgraph.match, and vertexMap is the mapping
// @deprecated
exports.createGoal = function(outer, inner, vertexMap) {
  var goal = inner.copy();
  _.forEach(vertexMap, function(o_id, i_id) {
    goal._idea[i_id] = outer.getIdea(o_id);
    goal.setData(i_id, outer.getData(o_id));
  });
  goal.concrete = true;
  return goal;
};

// outer has already been subgraph.match and vertexMap is the mapping; the transitions are the values we care about
// @deprecated
exports.createGoal2 = function(outer, transitions, vertexMap) {
  var goal = new Subgraph();
  var new_transitions = [];

  transitions.forEach(function(t) {
    var o_id = vertexMap[t.vertex_id];
    var g_id = goal.addVertex(exports.matcher.id, outer.getIdea(o_id), {transitionable: true});
    goal.setData(g_id, outer.getData(o_id));

    t = _.clone(t);
    t.vertex_id = g_id;
    if('replace_id' in t) {
      t.replace = outer.getData(vertexMap[t.replace_id]);
      delete t.replace_id;
    }

    new_transitions.push(t);
  });

  return exports.rewrite(goal, new_transitions, false);
};