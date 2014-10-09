'use strict';
var _ = require('lodash');
var config = require('../../../config');
var ids = require('../ids');

//
// internal functionality
//

var NEXT_ID = 'ideas';
var memory = {};

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
ProxyIdea.prototype.update = function(data) {
  _.merge(memory[this.id].data, data);
};
ProxyIdea.prototype.data = function() {
  return _.clone(memory[this.id].data);
};

//
// exported interface
// CRUD
//

exports.create = function(data) {
  var core = new CoreIdea(ids.next(NEXT_ID), data);
  memory[core.id] = core;
  return new ProxyIdea(core.id);
};
exports.save = function(idea) {
};
exports.load = function(id) {
};
exports.close = function(idea) {
  // TODO test if idea
  exports.save(idea);
  delete memory[idea.id];
};