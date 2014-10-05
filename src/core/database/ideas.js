'use strict';
var config = require('../../../config');

//
// internal functionality
//

// create a path/filename for an idea
function filepath(id, which) {
  return config.data.location + '/' + id + '_' + which + '.json';
}

/* this is the singleton that we will keep an internal reference to */
function CoreIdea(id, data) {
  this.id = id;
  this.data = data || {};
}

/* this just has pass through functions to access the singleton */
function ProxyIdea(id) { this.id = id; }

//
// exported interface
// CRUD
//

exports.create = function(data) {
};
exports.save = function(idea) {
};
exports.load = function(id) {
};
