// shallow copy.js

subgraph = {
    // these three are the vertex definition
    // pass around with parenting
    _matchdata: {}, // vertex_id: vertex
    // pass around with parenting until concrete, then just pass by ref
    _idea: {}, // vertex_id: idea
    // if !concrete, ignore; if concrete, deep copy
    _data: {}, // vertex_id: object

    edges: [],


    nextVertexId: '',
    parent: undefined,
    concrete: false
};

vertex = {
    id: '',
    matcher: fn,
    matchData: {},
    options: {}
};

edge = {
    src: vertex,
    link: type,
    dst: vertex,
    pref: 0
};

// --------------------

Subgraph.addVertex(matcher, matchData, options); // return vertex_id
Subgraph.addEdge(src, link, dst, pref);

Subgraph.prototype.copy = function() {
  var copy = new Subgraph();

  if(this.edges.length || this.matchdata.length) {
    this.parent = {
      matchdata: this.matchdata,
      edges: this.edges,
      parent: this.parent
    }
  }

  copy.nextVertexId = this.nextVertexId;
  copy.parent = this.parent;
  copy.concrete = this.concrete;

  return copy;
};

// --------------------

sg.match[b]
sg.idea[b]
sg.data[b]

// need accessor methods because it's more complicated
// the data isn't always on the subgraph
Subgraph.prototype.getVertex(id);
Subgraph.prototype.getIdea(id); // return this.idea[id];
Subgraph.prototype.getData(id); // return this.data[id];

// --------------------

// one global that deals with access of vertices
// since JS is single threaded, this will never partially resolve
//
// this let's our API focus on the vertices, rather than the subgraph
// i.e. you can get subgraph.vertex.data, rather than subgraph.data[vertex]
function current () {
  Object.defineProperties(current, {
    subgraph: '',
    id: '',

    get match () { return current.subgraph._matchdata[current.id] },
    get idea () { return current.subgraph._idea[current.id] },
    get data () { return current.subgraph._data[current.id] }
  });
}
current();

function updateCurrent(subgraph, vertex_id) {
  current.subgraph = subgraph;
  current.id = vertex_id;
}

function uhmCrow() {
  throw new Error('Uhmmm..... Crow?');
}

// put this in the constructor
// sg.vertices[x]
// Use node flag: --harmony-proxies
// MDN: Proxy (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
Subgraph.vertices = new Proxy(Subgraph, {
  get: updateCurrent,
  set: uhmCrow
});

// --------------------

sg.vertices[b].match
sg.vertices[b].idea
sg.vertices[b].data


