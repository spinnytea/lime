'use strict';
// these are the vertices of the though graph
// this is how all the data is stored

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
function CoreIdea(id, data, links) {
  this.id = id;
  this.data = data || {};
  this.links = links || {};
}

/* this just has pass through functions to access the singleton */
function ProxyIdea(id) { this.id = id; }
ProxyIdea.prototype.update = function(data) {
  exports.load(this.id);
  _.merge(memory[this.id].data, data);
};
ProxyIdea.prototype.data = function() {
  exports.load(this.id);
  return _.cloneDeep(memory[this.id].data);
};
ProxyIdea.prototype.link = function(link, idea) {
  if(typeof link !== 'object' || !link.name || !link.opposite)
    throw new TypeError('link must be a link');

  exports.load(this.id);

  if(idea) {
    if(!(idea instanceof ProxyIdea))
      throw new TypeError('must be a ProxyIdea');
    exports.load(idea.id);

    // ensure the links for this type has been created
    // add the id to the list
    (memory[this.id].links[link.name] = memory[this.id].links[link.name] || []).push(idea.id);
    (memory[idea.id].links[link.opposite.name] = memory[idea.id].links[link.opposite.name] || []).push(this.id);
  } else {
    var ret = memory[this.id].links[link.name];
    if(ret)
      return ret.map(function(id) { return new ProxyIdea(id); });
    return [];
  }
};
ProxyIdea.prototype.unlink = function(link, idea) {
  if(typeof link !== 'object' || !link.name || !link.opposite)
    throw new TypeError('link must be a link');
  idea = exports.load(idea);
  exports.load(this.id);

  // remove the idea from this
  var list = memory[this.id].links[link.name];
  list.splice(list.indexOf(idea.id), 1);
  if(list.length === 0) {
    // overloading list for the delete
    list = memory[this.id].links;
    delete list[link.name];
  }

  // remove this from the idea
  list = memory[idea.id].links[link.opposite.name];
  list.splice(list.indexOf(this.id), 1);
  if(list.length === 0) {
    // overloading list for the delete
    list = memory[idea.id].links;
    delete list[link.opposite.name];
  }
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

  var core = memory[idea.id];
  if(core) {
    if(!_.isEmpty(core.data))
      fs.writeFileSync(filepath(idea.id, 'data'), JSON.stringify(core.data), {encoding:'utf8'});
    if(!_.isEmpty(core.links))
      fs.writeFileSync(filepath(idea.id, 'links'), JSON.stringify(core.links), {encoding:'utf8'});
    else if(fs.existsSync(filepath(idea.id, 'links')))
      fs.unlink(filepath(idea.id, 'links'));
  }
};
exports.load = function(id) {
  if(id instanceof ProxyIdea)
    id = id.id;
  else if(typeof id !== 'string')
    throw new TypeError('can only load ideas');

  if(!(id in memory)) {
    var data;
    var dataPath = filepath(id, 'data');
    if(fs.existsSync(dataPath))
      data = JSON.parse(fs.readFileSync(dataPath, {encoding:'utf8'}));

    var links;
    var linksPath = filepath(id, 'links');
    if(fs.existsSync(linksPath))
      links = JSON.parse(fs.readFileSync(linksPath, {encoding:'utf8'}));

    var core = new CoreIdea(id, data, links);
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