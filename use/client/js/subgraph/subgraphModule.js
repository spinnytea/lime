'use strict';
// render a core/database/subgraph

module.exports = angular.module('lime.client.subgraph', [])
.factory('lime.client.subgraph.data', function() {
  var instance = {};

  instance.list = [];

  // parse subgraph.stringify
  instance.add = function(subgraphStr) {
    console.log(subgraphStr);
  };

  return instance;
})
;
