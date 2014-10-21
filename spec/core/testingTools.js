'use strict';
/* global afterEach */
var fs = require('fs');
var config = require('../../config');
var ideas = require('../../src/core/database/ideas');

exports.ideas = {};
var created = [];
// proxy functions so I can keep track of items that are created during the tests
// they will be automatically removed
exports.ideas.create = function(data) {
  var ret = ideas.create(data);
  created.push(ret.id);
  return ret;
};
// Copied from the src ideas / I need this to test but it shouldn't be global on ideas
exports.ideas.filepath = function(id, which) {
  return config.data.location + '/' + id + '_' + which + '.json';
};


function deleteFile(id, which) {
  // Copied from the src / I need this to test but it shouldn't be global
  var path = exports.ideas.filepath(id, which);
  if(fs.existsSync(path))
    fs.unlink(path);
}
afterEach(function() {
  created.forEach(function(id) {
    deleteFile(id, 'data');
    deleteFile(id, 'links');
  });
});