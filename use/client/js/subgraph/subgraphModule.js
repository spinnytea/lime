'use strict';
/* global d3 */
// render a core/database/subgraph

module.exports = angular.module('lime.client.subgraph', [])
.factory('lime.client.subgraph.data', function() {
  var instance = {};

  instance.list = [];

  // parse subgraph.stringify
  instance.add = function(subgraph) {
    subgraph = JSON.parse(subgraph);
  };

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


function buildGraph(graph, elem) {
  var width = 960,
      height = 500;

  var color = d3.scale.category20();

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
      .style('fill', function(d) { return color(d.group); })
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
