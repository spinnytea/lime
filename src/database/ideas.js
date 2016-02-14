'use strict';
// these are the vertices of the though graph
// this is how all the data is stored

var _ = require('lodash');
var fs = require('fs');
var mkdirp = require('mkdirp');
var config = require('../config');
var ids = require('../ids');
var links = require('./links');

// we need some way of accessing function so we can unit test them
// nothing inside exports.unit should need to be called or substituted
Object.defineProperty(exports, 'units', { value: {} });

config.onInit(function() {
  /* istanbul ignore if */
  if(!config.data.ideas) {
    config.data.ideas = {
      context: {}
    };
    config.save();

    if(config.settings.in_memory) {
      exports.units.boundaries.saveObj = memorySave;
      exports.units.boundaries.loadObj = memoryLoad;
      exports.units.boundaries.memory = { data: {}, links: {} };
    }
  }
});

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

exports.units.boundaries = {
  saveObj: fileSave,
  loadObj: fileLoad,
};

/* istanbul ignore next */
function fileSave(id, which, obj) {
  //void(which, obj, mkdirp); if(id !== '2') throw new Error('Not during unit tests');
  var path = exports.units.filepath(id);
  if(!fs.existsSync(path)) {
    // we don't want to recreate the whole directory root
    // i.e. this is a check to make sure our drive is mounted
    if(fs.existsSync(config.settings.location)) {
      mkdirp.sync(path);
    }
  }

  var filename = exports.units.filename(id, which);
  if(!_.isEmpty(obj))
    fs.writeFileSync(filename, JSON.stringify(obj), {encoding:'utf8'});
  else if(fs.existsSync(filename))
    fs.unlink(filename);
}
/* istanbul ignore next */
function fileLoad(id, which) {
  var filename = exports.units.filename(id, which);
  if(fs.existsSync(filename))
    return JSON.parse(fs.readFileSync(filename, {encoding:'utf8'}));
  return undefined;
}
function memorySave(id, which, obj) {
  exports.units.boundaries.memory[which][id] = obj;
}
function memoryLoad(id, which) {
  return exports.units.boundaries.memory[which][id];
}

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

  if(idea) {
    var id = idea.id || idea;
    exports.load(id);
    exports.load(this.id);

    // ensure the links for this type has been created
    // add the id to the list
    (memory[this.id].links[link.name] = memory[this.id].links[link.name] || {})[id] = new links.link();
    (memory[id].links[link.opposite.name] = memory[id].links[link.opposite.name] || {})[this.id] = new links.link();
  } else {
    exports.load(this.id);
    return Object.keys(memory[this.id].links[link.name] || {})
      .map(function(id) { return new ProxyIdea(id); });
  }
};
// @param link: links.list.thought_description
// @param idea: ProxyIdea or string
ProxyIdea.prototype.unlink = function(link, idea) {
  if(typeof link !== 'object' || !link.name || !link.opposite.name)
    throw new TypeError('link must be a link');
  idea = exports.load(idea);
  exports.load(this.id);

  // remove the idea from this
  var list = memory[this.id].links[link.name];
  delete list[idea.id];
  // TODO use a faster 'has keys' function
  if(Object.keys(list).length === 0) {
    delete memory[this.id].links[link.name];
  }

  // remove this from the idea
  list = memory[idea.id].links[link.opposite.name];
  delete list[this.id];
  if(Object.keys(list).length === 0) {
    delete memory[idea.id].links[link.opposite.name];
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
    exports.units.boundaries.saveObj(id, 'data', core.data);
    exports.units.boundaries.saveObj(id, 'links', core.links);
  }
};
exports.load = function(idea) {
  var id = idea.id || idea;
  if(!_.isString(id))
    throw new TypeError('can only load ideas');

  if(!(id in memory)) {
    var data = exports.units.boundaries.loadObj(id, 'data');
    var links = exports.units.boundaries.loadObj(id, 'links');
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