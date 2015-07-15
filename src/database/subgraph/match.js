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
// - is it okay just know there is an answer, or to think there may be one?
// - 1 known root with 10 fillers. that's 10! options
// - we don't need to list every option
// - but what can we do about it? what would this even look like?
// - can we try one solution, and start to nail down likely version
//   (pin down, say, 6, and then try all 4! remaining options)
module.exports = function match(subgraphOuter, subgraphInner, unitOnly) {
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
      if(innerSrcMatch.matcher === SG.matcher.id)
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
      if(innerDstMatch.matcher === SG.matcher.id)
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

      if(!unitOnly && number.difference(vo_data, vi_data) !== 0 && discrete.difference(vo_data, vi_data) !== 0)
        return false;
    }
  }
  return true;
}
