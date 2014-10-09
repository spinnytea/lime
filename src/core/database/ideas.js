'use strict';
var _ = require('lodash');
var fs = require('fs');
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
  exports.load(this.id);
  _.merge(memory[this.id].data, data);
};
ProxyIdea.prototype.data = function() {
  exports.load(this.id);
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
  if(!(idea instanceof ProxyIdea))
    throw new TypeError('can only close ideas');

  if((idea.id in memory) && !_.isEmpty(idea.data()))
    fs.writeFileSync(filepath(idea.id, 'data'), JSON.stringify(idea.data()), {encoding:'utf8'});
};
exports.load = function(id) {
  if(id instanceof ProxyIdea)
    id = id.id;
  else if(typeof id !== 'string')
    throw new TypeError('can only close ideas');

  if(!(id in memory)) {
    var data;
    var dataPath = filepath(id, 'data');
    if(fs.existsSync(dataPath))
      data = JSON.parse(fs.readFileSync(dataPath, {encoding:'utf8'}));

    var core = new CoreIdea(id, data);
    memory[id] = core;
  }

  return new ProxyIdea(id);
};
exports.close = function(idea) {
  if(!(idea instanceof ProxyIdea))
    throw new TypeError('can only close ideas');

  exports.save(idea);
  delete memory[idea.id];
};