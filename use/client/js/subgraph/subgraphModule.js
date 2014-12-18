'use strict';
/* global d3 */
// render a core/database/subgraph

module.exports = angular.module('lime.client.subgraph', [])
.factory('lime.client.subgraph.data', function() {
  var instance = {};

  instance.list = [];

  // parse subgraph.stringify
  instance.add = function(subgraph) {
    if(typeof subgraph === 'string')
      subgraph = JSON.parse(subgraph);
//    console.log(subgraph);

    // TODO determine some basic groups
    // - context link?
    instance.list.push({
      nodes: subgraph.vertices.map(function(vertex) {
        var name;
        if(vertex._data)
          name = JSON.stringify(vertex._data);
        else
          name = vertex.matcher + '(' + JSON.stringify(vertex.matchData) + ')';

        var type;
        if((vertex.matchData && vertex.matchData.name) ||
            subgraph.edges.some(function(e) { return e.dst === vertex.vertex_id && e.link === 'context'; }))
          type = 'context';

        return {
          name: name,
          type: type,
          color: vertex.color,
        };
      }),
      links: subgraph.edges.map(function(edge) {
        return {
          source: edge.src,
          target: edge.dst,
          value: 2,
        };
      }),
    });
  }; // end add

  // remap the vertices/edges after some vertices have been removed
  instance.remap = function(subgraph) {
    // build a map of before->after
    var map = {};
    subgraph.vertices.forEach(function(v, idx) {
      map[v.vertex_id] = idx;
    });

    // remap edges/remove
    subgraph.edges = subgraph.edges.map(function(e) {
      if(e.src in map && e.dst in map) {
        e.src = map[e.src];
        e.dst = map[e.dst];
        return e;
      } else {
        return undefined;
      }
    }).filter(function(e) {
      return e;
    });

    // re-id vertices
    subgraph.vertices.forEach(function(v, idx) {
      v.vertex_id = idx;
    });

    return subgraph;
  }; // end remap

  return instance;
})
.controller('lime.client.subgraph.example', [
  '$scope',
  function($scope) {
    $scope.myData = require('./exampleData');
  }
])
.directive('renderSubgraph', [
  function() {
    return {
      scope: {
        renderSubgraph: '=',
      },
      link: function($scope, elem) {
        buildGraph($scope.renderSubgraph, elem[0]);
      }
    };
  }
])
;


var width = 960;
var height = 500;
var typeColor = {
  context: '#ff7f0e',
};

function buildGraph(graph, elem) {

  var force = d3.layout.force()
      .charge(-120)
      .linkDistance(30)
      .size([width, height]);

  var svg = d3.select(elem).append('svg')
      .attr('width', width)
      .attr('height', height);

  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll('.link')
      .data(graph.links)
    .enter().append('line')
      .attr('class', 'link')
      .style('stroke-width', function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll('.node')
      .data(graph.nodes)
    .enter().append('circle')
      .attr('class', 'node')
      .attr('r', 5)
      .style('fill', function(d) { return typeColor[d.type] || d.color || '#7f7f7f'; })
      .call(force.drag);

  node.append('title')
      .text(function(d) { return d.name; });

  force.on('tick', function() {
    link.attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });

    node.attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });
  });
}
