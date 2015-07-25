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

  // TODO do we need to clone the edge array?
  // - can we make the assumption that you shouldn't add edges after a copy?
  // - can we assume that if you add an edge, then it applies to all versions?
  //sg._edges = this._edges
  // since edges are immutable, we can do a shallow copy of the array (note clone vs cloneDeep)
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
    matchRef: false // TODO look for uses of matchRef; ensure it doesn't use the local data (it should only use the matchRef's data)
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
exports.createGoal2 = function(outer, transitions, vertexMap) {
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

// when a plan has finished being created, should archive
// @return a new goal with all the data/ideas from stated mapped onto it
// @deprecated this isn't much different from being concrete; this doesn't buy us anything
exports.solidifyGoal = function(state, goal) {
  return exports.match(state, goal).map(function(map) {
    var g = new Subgraph();
    _.forEach(map, function(o_id, i_id) {
      // XXX should we save the old match data? instead of setting all id matchers?
      var g_id = g.addVertex(exports.matcher.id, state.getIdea(o_id),
        {transitionable:goal.getMatch(i_id).options.transitionable});
      g.setData(g_id, state.getData(o_id));
    });
    return g;
  });
};
