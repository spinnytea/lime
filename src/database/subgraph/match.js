'use strict';
// this is a function to support subgraphs

var _ = require('lodash');
var discrete = require('../../planning/primitives/discrete');
var number = require('../../planning/primitives/number');
var SG = require('../subgraph');

// use subgraphOuter as a base
// does subgraphInner fit inside of subgraphOuter?
// (basically a subgraph match on two subgraphs)
// @param unitOnly is specific to transitionable vertices and blueprint.tryTransition
// - when we need to see if a transition is possible, the match needs to see if we can combine the values
// - this boils down to "do the units match"
// AC: subgraph.match: i.options.transitionable === o.options.transitionable
//
// TODO problem with combinatorics
// - is it okay to think there may be an answer, or do we need to know there is one?
// - e.g.
// - 1 known root with 10 unknown fillers: this fn will find 10! vertexMaps
// - we don't need to list every option
// - but what can we do about it? what would this even look like?
// - can we try one solution, and start to nail down likely version
//   (pin down, say, 6, and then try all 4! remaining options)
// - how does the consume of this result decide which path to take since we don't explicitly list the options
module.exports = function match(subgraphOuter, subgraphInner, unitOnly) {
  if(!subgraphOuter.concrete)
    throw new RangeError('the outer subgraph must be concrete before you can match against it');

  // if there are no vertices, return nothing
  if(subgraphInner._vertexCount === 0)
    return [];

  if(subgraphInner._vertexCount > subgraphOuter._vertexCount)
    return [];

  unitOnly = (unitOnly === true);

  var vertexMap = initializeVertexMap(subgraphOuter, subgraphInner, unitOnly);
  if(vertexMap === undefined)
    return [];

  // if there are no edges, return the map
  if(subgraphInner._edgeCount === 0) {
    // if there are edges, and all vertices have been mapped, we still need to check the edges to make sure they match
    // this is a special case for when there are no edges
    // it keeps us from needing to bake it into the top of subgraphMatch
    if(Object.keys(vertexMap).length === subgraphInner._vertexCount)
      return [vertexMap];
    return [];
  }

  var subgraphMatchData = initSubgraphMatchData(subgraphOuter, subgraphInner, vertexMap, unitOnly);

  // with this information, fill out the map using the edges
  // (note: there may not yet be any edges specified)
  return subgraphMatch(subgraphMatchData)
    .filter(function(map) {
      return Object.keys(map).length === subgraphInner._vertexCount;
    });
}; // end exports.match

Object.defineProperty(module.exports, 'units', { value: {} });
module.exports.units.initSubgraphMatchData = initSubgraphMatchData;
module.exports.units.initializeVertexMap = initializeVertexMap;
module.exports.units.subgraphMatch = subgraphMatch;
module.exports.units.filterOuter = filterOuter;
module.exports.units.resolveMatchData = resolveMatchData;
module.exports.units.vertexTransitionableAcceptable = vertexTransitionableAcceptable;
module.exports.units.vertexFixedMatch = vertexFixedMatch;

// compute all the caches/indexes for subgraph match
// TODO make a state object that we can pass between functions instead of all these crazy arguments
// - right now it's just collecting all the arguments into an object
// - build inverseVertexMap
// - build outerEdge index (remove the list) so we don't need to filter them
function initSubgraphMatchData(subgraphOuter, subgraphInner, vertexMap, unitOnly) {
  return {
    outer: subgraphOuter,
    inner: subgraphInner,
    outerEdges: subgraphOuter.allEdges(),
    innerEdges: subgraphInner.allEdges(),
    vertexMap: vertexMap,
    skipThisTime: [],
    unitOnly: unitOnly
  };
}

// build a reverse map (outer.idea.id -> outer.vertex_id)
// <insert: arguments for indexing>
// < ((ni+no)*log(no) vs (ni*no)) >
function buildInverseOuterMap(subgraphOuter) {
  return _.reduce(subgraphOuter.allIdeas(), function(map, vo_idea, vo_key) {
    map[vo_idea.id] = vo_key;
    return map;
  }, {});
}

// pre-fill a vertex map with identified thoughts
// TODO write up two ways of calculating this
// - one for the n
// - xlnx / (x-lnx); if ni is greater than that thing, use the index
function initializeVertexMap(subgraphOuter, subgraphInner, unitOnly) {
  var vertexMap = {};

  var inverseOuterMap = buildInverseOuterMap(subgraphOuter);
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

      // Integration test with lm-wumpus
      // - testing match data against raw vertices causes this match to fail
      // - I'm guess because... the goal state doesn't match itself (needs testing)
      // - the goal is often generated from the requirements data (not necessarily solidified)
      // - we could require that a goal pass through subgraph.solidify and then enforce this, but is that a value add?
      // - is it necessary to pass the matcher once the idea has been identified?
      // - isn't the point of identifying the idea so that we can skip all this matcher stuff?
      // TODO test: run a single actuator through scheduleBlueprint
      //if(possible)
      //  possible = vertexFixedMatch(subgraphInner.getData(vi_key), subgraphInner.getMatch(vi_key), subgraphOuter, vo_key, unitOnly);
    }
    return possible;
  });

  if(!possible)
    return undefined;

  return vertexMap;
}

// this is the function that does the matching
// (subgraphMatch is the recursive case, exports.match is the seed case)
// more specifically, it will use the edges/matchers to expand a list of possible vertexMaps
//
// map[inner.vertex_id] = outer.vertex_id;
// we will typically use the inner subgraph to find the indices of the outer map
// match all of the innerEdges to the outerEdges
function subgraphMatch(subgraphMatchData) {
  // pick the best inner edge
  // (this should help us reduce the number of branches)
  var innerEdge = subgraphMatchData.innerEdges.reduce(function(prev, curr) {
    if(prev === null || curr.options.pref > prev.options.pref && subgraphMatchData.skipThisTime.indexOf(curr) === -1)
      return curr;
    return prev;
  }, null);

  // TODO instead of rebuilding the inverse on every [recursive] iteration, build it alongside vertexMap
  var inverseMap = _.invert(subgraphMatchData.vertexMap);

  // find all matching outer edges
  var matches = subgraphMatchData.outerEdges.filter(function(currEdge) {
    return filterOuter(subgraphMatchData, currEdge, innerEdge, inverseMap);
  });

  // recurse (on picking matchRef too soon)
  if(matches.length === 0) {
    var innerSrcMatch = subgraphMatchData.inner.getMatch(innerEdge.src);
    var innerDstMatch = subgraphMatchData.inner.getMatch(innerEdge.dst);

    // because of indirection, we may need to skip an edge and try the next best one
    // so if our current edge uses inderection, and there are other edges to try, then, well, try again
    // but next time, don't consider this edge
    if((innerSrcMatch.options.matchRef || innerDstMatch.options.matchRef) && subgraphMatchData.innerEdges.length > subgraphMatchData.skipThisTime.length) {
      subgraphMatchData.skipThisTime.push(innerEdge);
      return subgraphMatch(subgraphMatchData);
    }

    // no matches, and we've skipped everything
    return [];
  }

  // shallow copy the inner without the current match
  var newInner = subgraphMatchData.innerEdges.filter(function(e) { return e !== innerEdge; });
  // recurse (standard)
  // TODO if matches.length === 1, then we don't need to copy everything, we can update in subgraphMatchData in place
  return matches.map(function(outerEdge) {
    // update the new matches
    var newMap = _.clone(subgraphMatchData.vertexMap);
    if(outerEdge.link === innerEdge.link) {
      newMap[innerEdge.src] = outerEdge.src;
      newMap[innerEdge.dst] = outerEdge.dst;
    } else { // outerEdge.link === innerEdge.link.opposite
      newMap[innerEdge.src] = outerEdge.dst;
      newMap[innerEdge.dst] = outerEdge.src;
    }

    // shallow copy the outer without the current match
    var newOuter = subgraphMatchData.outerEdges.filter(function(e) { return e !== outerEdge; });

    if(newInner.length === 0) {
      // base case
      // if there are no more inner edges to match, then our vertex map is complete
      return [newMap];
    } else {
      // recursive case
      // get a list of all matches from this branch
      var newMatchData = _.clone(subgraphMatchData);
      newMatchData.outerEdges = newOuter;
      newMatchData.innerEdges = newInner;
      newMatchData.vertexMap = newMap;
      newMatchData.skipThisTime = [];
      return subgraphMatch(newMatchData);
    }
  }).reduce(function(list, match) {
    // reduce all match lists into a single list
    Array.prototype.push.apply(list, match);
    return list;
  }, []);
} // end subgraphMatch

// in subgraphMatch, we need to find a list outer edges that match the current inner edge
function filterOuter(subgraphMatchData, currEdge, innerEdge, inverseMap) {
  var srcMapped = (innerEdge.src in subgraphMatchData.vertexMap);
  var dstMapped = (innerEdge.dst in subgraphMatchData.vertexMap);

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
    if(subgraphMatchData.vertexMap[innerEdge.src] !== currEdge.src)
      return false;
  } else {
    // currEdge src is mapped to a different inner id
    if(currEdge.src in inverseMap)
      return false;
  }
  if(dstMapped) {
    if(subgraphMatchData.vertexMap[innerEdge.dst] !== currEdge.dst)
      return false;
  } else {
    // currEdge dst is mapped to a different inner id
    if(currEdge.dst in inverseMap)
      return false;
  }

  var innerSrcMatch = subgraphMatchData.inner.getMatch(innerEdge.src);
  var innerDstMatch = subgraphMatchData.inner.getMatch(innerEdge.dst);

  // find the target data we are interested
  var srcData = resolveMatchData(subgraphMatchData, innerEdge.src, innerSrcMatch);
  if(srcData === null)
    return false;
  var dstData = resolveMatchData(subgraphMatchData, innerEdge.dst, innerDstMatch);
  if(dstData === null)
    return false;

  // check the transitionability of both src and dst
  if(!vertexTransitionableAcceptable(
      subgraphMatchData.outer.getMatch(currEdge.src).options.transitionable,
      subgraphMatchData.outer.getData(currEdge.src),
      innerSrcMatch.options.transitionable,
      srcData,
      subgraphMatchData.unitOnly))
    return false;
  if(!vertexTransitionableAcceptable(
      subgraphMatchData.outer.getMatch(currEdge.dst).options.transitionable,
      subgraphMatchData.outer.getData(currEdge.dst),
      innerDstMatch.options.transitionable,
      dstData,
      subgraphMatchData.unitOnly))
    return false;

  if(!subgraphMatchData.inner.getIdea(innerEdge.src)) {
    if (!vertexFixedMatch(srcData, innerSrcMatch, subgraphMatchData.outer, currEdge.src, subgraphMatchData.unitOnly))
      return false;
  }
  if(!subgraphMatchData.inner.getIdea(innerEdge.dst)) {
    if(!vertexFixedMatch(dstData, innerDstMatch, subgraphMatchData.outer, currEdge.dst, subgraphMatchData.unitOnly))
      return false;
  }

  return true;
} // end outerFilter

// subgraphs are non-trivial
// the data could be in a few different places
// @param inner: inner subgraph
// @param innerVertexId: the id of the vertex in inner that we are interested in
// @param innerMatch: `inner.getMatch(innerVertexId)` (so we can use a cached result)
// @param vertexMap: vertices that are already mapped
// @param outer: outer subgraph
// @return undefined, object are valid results; null is in invalid result (there should be no other types)
function resolveMatchData(subgraphMatchData, innerVertexId, innerMatch) {
  // this is pretty simple if the target is already associated with an idea
  // or if the vertex is !matchRef
  if(subgraphMatchData.inner.getIdea(innerVertexId) || !innerMatch.options.matchRef)
    return subgraphMatchData.inner.getData(innerVertexId);

  // if our inner graph has a value cached, use that
  if(subgraphMatchData.inner.getData(innerMatch.data))
    return subgraphMatchData.inner.getData(innerMatch.data);

  // if we have already mapped the vertex in question (the matchRef target; match.data), then use the outer data
  // (mapped, but the inner hasn't been updated with the idea)
  // (note: we may not have mapped the matchRef target by this point, and that's okay)
  if(innerMatch.data in subgraphMatchData.vertexMap)
    return subgraphMatchData.outer.getData(subgraphMatchData.vertexMap[innerMatch.data]);

  // we can't find data to use
  return null;
}

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

      if(unitOnly && vo_data  && !number.isNumber(vo_data) && !discrete.isDiscrete(vo_data))
        return false;

      if(unitOnly && vi_data  && !number.isNumber(vi_data) && !discrete.isDiscrete(vi_data))
        return false;

      if(!unitOnly && number.difference(vo_data, vi_data) !== 0 && discrete.difference(vo_data, vi_data) !== 0)
        return false;
    }
  }
  return true;
}

// check the matcher function against the outer data
// this should only be called if the inner idea has not been identified
//
// if a vertex is not marked as transitionable
// or if we are not checking unit only
// then we need a harder check on the value
//
// @param innerData: the result of resolveMatchData
// @param innerMatch
// @param outer
// @param outerVertexId
// @param unitOnly
function vertexFixedMatch(innerData, innerMatch, outer, outerVertexId, unitOnly) {
  if(!unitOnly || !innerMatch.options.transitionable) {
    // if matchRef, then we want to use the data we found as the matcher data
    // if !matchRef, then we need to use the matchData on the object
    // this will also correct for SG.matcher.id
    if(!innerMatch.options.matchRef)
      innerData = innerMatch.data;

    // outer data is simple since it's concerete
    var outerData;
    if(innerMatch.matcher === SG.matcher.id)
      outerData = outer.getIdea(outerVertexId);
    else
      outerData = outer.getData(outerVertexId);

    if(!innerMatch.matcher(outerData, innerData))
      return false;
  }
  return true;
}
