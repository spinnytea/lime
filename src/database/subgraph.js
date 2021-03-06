'use strict';
var _ = require('lodash');
var ideas = require('./ideas');
var links = require('./links');

// these imports need to be a different name because we have exports.matcher.discrete and exports.matcher.number
// we want to keep the API standard, so we can change the import in this file
var crtcrt = require('../planning/primitives/discrete');
var numnum = require('../planning/primitives/number');

// we need some way of accessing function so we can unit test them
// nothing inside exports.unit should need to be called or substituted
Object.defineProperty(exports, 'units', { value: {} });

// build a new transition map using the glue
// the transitions are based on an inner graph
// e.g. we matched requirements to a context, and now we want to transition the context
exports.units.convertInnerTransitions = function(transitions, glue) {
  return transitions.map(function(t) {
    t = _.clone(t);
    t.vertex_id = glue[t.vertex_id];
    if(t.hasOwnProperty('replace_id'))
      t.replace_id = glue[t.replace_id];
    return t;
  });
};

// this is an overlay on the idea database
// it is a proxy or wrapper around the idea graph
// it's main purpose is to find a subgraph within the larger database
//
// you define the shape the graph you want to find, each node has it's own matcher
//
// there are three different stages to this subgraph
// each vertex contains data for these three stages
// but for the sake of efficiency, they are not stored together
//
// when an _idea is defined, then there isn't any need to use the _match for that node
// when an _idea is defined, then it will never be unset (this is immutable)
// TODO does this mean we should remove the match data for this vertex?

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
  this._edges = {};
  // do a lazy copy of cache data
  // don't copy the data if we don't need to
  this._edgesParent = undefined;


  // when we generate a new vertex, we need a new key
  // we also want fast access to the number of vertices we have
  this._vertexCount = 0;

  // when we generate a new edge, we need a new key
  // we also want fast access to the number of edges we have
  this._edgeCount = 0;

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

  // the ideas should/will never change
  // so we can reference the original
  // this is what we are trying to pin down, so as we do so we can copy them directly
  _.assign(sg._idea, this._idea);

  // do the parent copy for the applicable values
  copyParentyThing(this, sg, 'match');
  copyParentyThing(this, sg, 'data');
  copyParentyThing(this, sg, 'edges');

  sg._vertexCount = this._vertexCount;
  sg._edgeCount = this._edgeCount;
  sg.concrete = this.concrete;

  return sg;
};
function copyParentyThing(old, copy, key) {
  key = '_' + key;
  var parentKey = key + 'Parent';

  // if there are locally defined values
  // then put it in a parent object
  // make that a parent of this
  if(!_.isEmpty(old[key])) {
    old[parentKey] = {
      obj: old[key],
      parent: old[parentKey]
    };
    old[key] = {};
  }
  // defined or undefined, we need to pass the parent to the copy
  copy[parentKey] = old[parentKey];
  // both old and new will have key thing will be empty
}

// add a vertex to the graph
// this only specifies match data
// the other parts (ideas / data) need to be found later
//
// @param matcher: exports.matcher or equivalent
// @param matchData: passed to the matcher
// TODO should matchData be inside options?
// - if(matcher !== filler && options.matchData === undefined) throw new Error('matchData must be defined');
// @param options: {
//   transitionable: boolean, // if true, this part of a transition (subgraph.rewrite, blueprints, etc; subgraph.rewrite(transitions);)
//                            // it means that we are intending to change the value
//   matchRef: boolean, // if true, this should use a different object for the matchData
//                      // specifically, use vertex[matchData].data instead of matchData
//                      // (it doesn't make sense to use this with matcher.filler)
// }
// TODO add support for matchRef in blueprints; look for any case where we use vertex.data
Subgraph.prototype.addVertex = function(matcher, data, options) {
  options = _.merge({
    // TODO do these NEED to be specified? can we leave them undefined?
    transitionable: false,
    matchRef: false // TODO look for uses of matchRef; ensure it doesn't use the local data (it should only use the matchRef's data)
  }, options);

  if(!matcher || matcher !== exports.matcher[matcher.name])
    throw new RangeError('invalid matcher');
  if(options.matchRef && this.getMatch(data) === undefined)
    throw new RangeError('matchRef target (match.data) must already be a vertex');
  if(matcher === exports.matcher.substring)
    data.value = data.value.toLowerCase();

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
// @param options.pref: higher prefs will be considered first (default: 0)
// @param options.transitive: the same as link.transitive; will search in a transitive manner TODO does subgraph.match need to support this?
//
// TODO should the edges be stored in a normalized form <if(link.isOpp) then(swap)> so we don't need to account for it while searching/matching?
//
// - rejected options
// @param options.byIdeaLink: during subgraph.match, instead of matching subgraph edges uses the existing idea link TODO come up with a better key name
// - we can't do this because the subgraph represents our imagination, we can't plan ahead if we don't let the subgraph contain ALL the information
Subgraph.prototype.addEdge = function(src, link, dst, options) {
  options = _.merge({
    // TODO do these NEED to be specified? can we leave them undefined?
    pref: 0,
    transitive: false,
    transitionable: false
  }, options);

  var id = this._edgeCount + '';
  this._edgeCount++;

  this._edges[id] = {
    src: src,
    link: link,
    dst: dst,
    options: options
  };

  var srcIdea = this.getIdea(src);
  if(srcIdea) {
    var dstIdea = this.getIdea(dst);
    if(dstIdea) {
      // both ideas are defined
      // so we need to see if the edge fits this definition
      if(!srcIdea.link(link).some(function(idea) { return idea.id === dstIdea.id; })) {
        // TODO we need to verify that the transitive-link is valid
        if(!link.transitive && !options.transitive) {
          // if the edge doesn't match, then this is no longer concrete and these edges don't match
          // the rest of the graph is fine, this section is invalid
          this.deleteIdea(src);
          this.deleteIdea(dst);
          this.concrete = false;
        }
      }
    }
  }
  // if only one of the vertices has an idea, then
  // - this.concrete is already false
  // - there is no idea to check for a match, anyway

  return id;
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

Subgraph.prototype.getEdge = function(id) {
  if(id in this._edges)
    return this._edges[id];

  // use case micro optimizations
  // this will USUALLY be 0 or 1 layers deep
  if(!this._edgesParent)
    return undefined;
  var parent = this._edgesParent;
  if(parent.parent === undefined)
    return parent.obj[id];

  return searchParent(id, parent);
};
// collect all the edges into a list
Subgraph.prototype.allEdges = function() {
  var edges = _.clone(this._edges);
  acrossParents(this._edgesParent, function(value, id) {
    // the children can overwrite the data without affecting the parents
    // so if the data is already present, then don't overwrite it
    if(!(id in edges))
      edges[id] = value;
  });
  return _.values(edges);
};

exports.Subgraph = Subgraph;


function forAllVertices(sg, callback) {
  for(var i=0; i<sg._vertexCount; i++)
    callback(i+'');
}
function forAllEdges(sg, callback) {
  for(var i=0; i<sg._edgeCount; i++)
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
  substring: function substring(data, matchData) {
    if(matchData.path && matchData.path.length)
      data = _.property(matchData.path)(data);
    if(!_.isString(data))
      return false;
    return data.toLowerCase().indexOf(matchData.value) !== -1;
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
    // the children can overwrite the data without affecting the parents
    // so if the data is already present, then don't overwrite it
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

  var edges = {};
  forAllEdges(sg, function(id) {
    var value = sg.getEdge(id);
    edges[id] = {
      src: value.src,
      link: value.link.name,
      dst: value.dst,
      options: value.options
    };
  });

  return JSON.stringify({
    match: match,
    idea: _.reduce(sg.allIdeas(), function(result, value, key) {
      result[key] = value.id;
      return result;
    }, {}),
    data: data,

    edges: edges,

    vertexCount: sg._vertexCount,
    edgeCount: sg._edgeCount,
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

  _.forEach(str.edges, function(e, key) {
    sg._edges[key] = {
      src: e.src,
      link: links.list[e.link],
      dst: e.dst,
      options: e.options
    };
  });

  sg._vertexCount = str.vertexCount;
  sg._edgeCount = str.edgeCount;
  sg.concrete = str.concrete;

  return sg;
};


exports.search = require('./subgraph/search');
exports.match = require('./subgraph/match');
exports.rewrite = require('./subgraph/rewrite');

// inner and outer have already been subgraph.match, and vertexMap is the mapping
// @deprecated use the existing goals from the plan (attach them to the glue during tryTransition)
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
// used to allow replanning when you already have a vertexMap (a specific match; because requirements may match in multiple ways)
// TODO move createTransitionedGoal into rewrite
exports.createTransitionedGoal = function(outer, transitions, vertexMap) {
  var goal = new Subgraph();
  var new_transitions = [];

  transitions.forEach(function(t) {
    var o_id = vertexMap[t.vertex_id];
    var g_id = goal.addVertex(exports.matcher.id, outer.getIdea(o_id), {transitionable: true});
    goal.setData(g_id, outer.getData(o_id));

    t = _.clone(t);
    t.vertex_id = g_id;
    if(t.hasOwnProperty('replace_id')) {
      t.replace = outer.getData(vertexMap[t.replace_id]);
      delete t.replace_id;
    }

    new_transitions.push(t);
  });

  return exports.rewrite(goal, new_transitions, false);
};
