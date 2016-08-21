'use strict';
// this is a function to support subgraphs

var _ = require('lodash');
var SG = require('../subgraph');

// find a list of subgraphs in the database that matches the supplied subgraph
//
// use Prim's algorithm to expand the known subgraph
// we are trying to identify all of the vertices
// we use edges to find new ones
module.exports = function search(subgraph) {
  if(subgraph.concrete)
    return [subgraph];

  // find an edge to expand
  var selected = findEdgeToExpand(subgraph);
  // if some of the edges are invalid, then return 'no match'
  if(selected === undefined) return [];

  // expand the edge
  var nextSteps = expandEdge(subgraph, selected);

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

Object.defineProperty(module.exports, 'units', { value: {} });
module.exports.units.findEdgeToExpand = findEdgeToExpand;
module.exports.units.expandEdge = expandEdge;

// @return the matched edge/branches
function findEdgeToExpand(subgraph) {
  var selected = { edge: undefined, branches: undefined };

  var valid = subgraph.allEdges().every(function(currEdge) {
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
      if(currEdge.link.transitive || currEdge.transitive) {
        // keep following the link
        var uniqueMap = _.keyBy(currBranches, 'id');
        var dir = isSrc?currEdge.link:currEdge.link.opposite; // follow the direction AWAY from the defined vertex
        while(currBranches.length) {
          var next = currBranches.pop();
          next.link(dir).forEach(function(b) {
            if(!uniqueMap.hasOwnProperty(b.id)) {
              uniqueMap[b.id] = b;
              currBranches.push(b);
            }
          });
        }
        currBranches = _.values(uniqueMap);
      }


      if(!selected.edge) {
        selected.edge = currEdge;
        selected.branches = currBranches;
      } else if(currEdge.options.pref === selected.edge.options.pref) {
        if(currBranches.length < selected.branches.length) {
          selected.edge = currEdge;
          selected.branches = currBranches;
        }
      } else if(currEdge.options.pref > selected.edge.options.pref) {
        selected.edge = currEdge;
        selected.branches = currBranches;
      }

    } else if(isSrc && isDst) {
      // verify that all this edge is present
      // TODO cache the result so we don't need to check this for every subgraph
      if(!srcIdea.link(currEdge.link).some(function(idea) { return idea.id === dstIdea.id; })) {
        // if the link is transitive, then it may not be directly connected
        // TODO we need to verify that the transitive-link is valid
        if(!!currEdge.link.transitive || !!currEdge.transitive)
          return searchForTransitiveLink(srcIdea, currEdge.link, dstIdea);

        // if we can't resolve this edge, then this graph is invalid
        return false;
      }
    }

    return true;
  });

  if(!valid)
    return undefined;

  return selected;
}

// TODO this is a depth-first algorithm that doesn't keep track of where it's been
// - it can easily infinite loop
// - it could at LEAST be breadth first, but even then it could spiral out of control
function searchForTransitiveLink(srcIdea, link, dstIdea) {
  return srcIdea.link(link).some(function(idea) {
    if(idea.id === dstIdea.id) return true;
    return searchForTransitiveLink(idea, link, dstIdea);
  });
}

// @return the subgraph(s) with the expansion applied
function expandEdge(subgraph, selected) {
  var nextSteps = [];

  if(selected.edge && selected.branches) {
    // pick the vertex to expand
    var vertex_id = (subgraph.getIdea(selected.edge.src) === undefined) ? selected.edge.src : selected.edge.dst;
    var match = subgraph.getMatch(vertex_id);
    var matchData = match.options.matchRef?subgraph.getData(match.data):match.data;

    var matchedBranches = selected.branches.filter(function(idea) {
      if(match.matcher === SG.matcher.id)
      // this can occur if we are using matchRef
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

  return nextSteps;
}
