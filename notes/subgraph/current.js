// current.js
//

subgraph = {
  vertices: {},
  edges: [],

  concrete: false // sg.vertices.every(fn(v) { return v.idea !== undefined; })
};

vertex = {
  vertex_id: '',

  // recipe, find in the world
  matcher: function() {},
  matchData: {},
  options: {},

  // Subgraph.search
  // concrete = true
  // Note: can delete matcher info at this point
  // - we won't ever be searching again
  // - Subgraph.match uses the matcher data of the one above this

  // pinned context
  idea: undefined,

  // plan

  // theoretical state
  data: undefined  // idea.data()
};

edge = {
  src: vertex,
  link: type,
  dst: vertex,
  pref: 0
};

// -------------------------------

Subgraph.prototype.addVertex(matcher, matchData, options);  // return vertex_id
Subgraph.prototype.addEdge(src, link, dst, pref);


var sg = new Subgraph();
var a = sg.addVertex(id, 'particular_id');
var b = sg.addVertex(number, { value: 1, unit: 'apple' });
sg.addEdge(a, 'has', b);
// sg.concrete === false;
// sg.vertices[a].idea.id === 'particular_id'
// sg.vertices[b].idea == undefined


sg.search();
// sg.concerte === true;
// sg.vertices[a].idea.id === 'particular_id'
// sg.vertices[b].idea.id === 'some_id'


sg.vertices[b].data = { value: 2, unit: 'apple' }
// sg.vertices[b].data.value === 2
// sg.vertices[b].idea.data().value === 1


_.forEach(sg.vertices, function(v) { /* do a thing */ });



