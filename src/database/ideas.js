'use strict';
// these are the vertices of the though graph
// this is how all the data is stored

var _ = require('lodash');
var fs = require('fs');
var mkdirp = require('mkdirp');
var config = require('../config');
var ids = require('../ids');

// we need some way of accessing function so we can unit test them
// nothing inside exports.unit should need to be called or substituted
Object.defineProperty(exports, 'units', { value: {} });

//
// internal functionality
//

/* istanbul ignore if */
if(!config.data.ideas) {
  config.data.ideas = {
    context: {}
  };
  config.save();
}

var NEXT_ID = 'ideas';
var memory = exports.units.memory = {};

// create a path/filename for an idea
exports.units.filepath = function(id) {
  var suffix = '';
  if(id.length > 2)
    suffix = '/' + id
      .substr(0, (id.length-2+(id.length%2)))
      .match(/../g)
      .join('/');
  return config.settings.location + suffix;
};
exports.units.filename = function(id, which) {
  return exports.units.filepath(id) + '/' + id + '_' + which + '.json';
};

/*
 * this is the singleton that we will keep an internal reference to
 * it's basically just a named structure
 */
function CoreIdea(id, data, links) {
  this.id = id;
  this.data = data || {};
  this.links = links || {};
}

/*
 * ProxyIdea is an object that only stores the ID
 * this makes it easy to pass around as a data object, to serialize, to load
 * essentially, its just an object { id: 'x' }
 * we can JSON.stringify; we can exports.proxy
 * The functions that are on ProxyIdea reference a singleton that stores the data
 */
function ProxyIdea(id) { this.id = id; }
ProxyIdea.prototype.update = function(data) {
  exports.load(this.id);
  memory[this.id].data = _.cloneDeep(data);
};
ProxyIdea.prototype.data = function() {
  exports.load(this.id);
  return _.cloneDeep(memory[this.id].data);
};
// @param link: links.list.thought_description
// @param idea: ProxyIdea or string
ProxyIdea.prototype.link = function(link, idea) {
  if(typeof link !== 'object' || !link.name || !link.opposite.name)
    throw new TypeError('link must be a link');

  exports.load(this.id);

  if(idea) {
    var id = idea.id || idea;
    exports.load(id);

    // ensure the links for this type has been created
    // add the id to the list
    (memory[this.id].links[link.name] = memory[this.id].links[link.name] || []).push(id);
    (memory[id].links[link.opposite.name] = memory[id].links[link.opposite.name] || []).push(this.id);
  } else {
    var ret = memory[this.id].links[link.name];
    if(ret)
      return ret.map(function(id) { return new ProxyIdea(id); });
    return [];
  }
};
// @param link: links.list.thought_description
// @param idea: ProxyIdea or string
ProxyIdea.prototype.unlink = function(link, idea) {
  if(typeof link !== 'object' || !link.name || !link.opposite.name)
    throw new TypeError('link must be a link');
  idea = exports.load(idea); // if idea is a string, it will return as an idea
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
  var core = new CoreIdea(ids.next(NEXT_ID), _.cloneDeep(data));
  memory[core.id] = core;
  if(data) exports.save(core.id);
  return new ProxyIdea(core.id);
};
exports.save = function(idea) {
  var id = idea.id || idea;
  if(!_.isString(id))
    throw new TypeError('can only save ideas');

  var core = memory[id];
  if(core) {
    var path = exports.units.filepath(id);
    if(!fs.existsSync(path)) {
      // we don't want to recreate the whole directory root
      // i.e. this is a check to make sure our drive is mounted
      if(fs.existsSync(config.settings.location)) {
        mkdirp.sync(path);
      }
    }

    if(!_.isEmpty(core.data))
      fs.writeFileSync(exports.units.filename(id, 'data'), JSON.stringify(core.data), {encoding:'utf8'});

    if(!_.isEmpty(core.links))
      fs.writeFileSync(exports.units.filename(id, 'links'), JSON.stringify(core.links), {encoding:'utf8'});
    else if(fs.existsSync(exports.units.filename(id, 'links')))
      fs.unlink(exports.units.filename(id, 'links'));
  }
};
exports.load = function(idea) {
  var id = idea.id || idea;
  if(!_.isString(id))
    throw new TypeError('can only load ideas');

  if(!(id in memory)) {
    var data;
    var dataPath = exports.units.filename(id, 'data');
    if(fs.existsSync(dataPath))
      data = JSON.parse(fs.readFileSync(dataPath, {encoding:'utf8'}));

    var links;
    var linksPath = exports.units.filename(id, 'links');
    if(fs.existsSync(linksPath))
      links = JSON.parse(fs.readFileSync(linksPath, {encoding:'utf8'}));

    memory[id] = new CoreIdea(id, data, links);
  }

  return new ProxyIdea(id);
};
exports.proxy = function(idea) {
  var id = idea.id || idea;
  if(!_.isString(id))
    throw new TypeError('can only proxy ideas');
  return new ProxyIdea(id);
};
exports.close = function(idea) {
  var id = idea.id || idea;
  if(!_.isString(id))
    throw new TypeError('can only close ideas');

  exports.save(idea);
  delete memory[id];
};

exports.context = function(name) {
  var id = config.data.ideas.context[name];
  if(id) {
    return exports.proxy(id);
  } else {
    id = exports.create();
    config.data.ideas.context[name] = id.id;
    config.save();
    return id;
  }
};