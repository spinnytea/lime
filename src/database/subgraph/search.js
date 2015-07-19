'use strict';
// this is a function to support subgraphs

var SG = require('../subgraph');

// find a list of subgraphs in the database that matches the supplied subgraph
//
// use Prim's algorithm to expand the known subgraph
// we are trying to identify all of the vertices
// we use edges to find new ones
module.exports = function search(subgraph) {
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
      if(match.matcher === SG.matcher.id)
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
      Array.prototype.push.apply(ret, search(sg));
      return ret;
    }, []);
  }

};
