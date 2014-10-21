'use strict';
var _ = require('lodash');

// this is an overlay on the idea database
// it is a proxy or wrapper around the idea graph
// it's main purpose is to find a subgraph within the larger database
//
// you define the shape the graph you want to find, each node has it's own matcher



// default matchers; but you can provide your own
exports.matcher = {
  id: function(idea, matchData) {
    return matchData === idea.id;
  },
  filler: function() {
    return true;
  },
  data: {
    exact: function(idea, matchData) {
      return _.isEqual(idea.data(), matchData);
    },
    similar: function(idea, matchData) {
      // FIXME this implementation is bad and I should feel bad

      // matchData should be contained within data
      var data = idea.data();
      var d2 = _.cloneDeep(data);
      _.merge(d2, matchData);
      return _.isEqual(data, d2);
    },
  },
};