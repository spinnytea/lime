'use strict';
/* global beforeEach, afterEach */
var _ = require('lodash');
var fs = require('fs');
var q = require('q');
var config = require('../../config');
var ideas = require('../../src/core/database/ideas');
var links = require('../../src/core/database/links');

exports.ideas = {};

// keep a list of the objects we create
// this way we can clean up after them
var created = [];

// we only want to do the unlink process on objects that actually call link
// removing all links for an object is time consuming and slows down the tests
// this is reset for every tests
// every object created in this round of testing will have links removed
// but at least it's not every object in every round
var doUnlink = false;

// proxy functions so I can keep track of items that are created during the tests
// they will be automatically removed
exports.ideas.create = function(data) {
  var ret = ideas.create(data);
  created.push(ret.id);

  // TODO this changes the object (what about proxy objects or Object.watch?)
  // is there something else we can do instead?
  Object.defineProperty(ret, 'link', {
    enumerable: false, // a hack because we test Object.keys(ProxyIdea)
    value: function(link, idea) {
      doUnlink = true;
      return ret.constructor.prototype.link.call(ret, link, idea);
    }
  });

  return ret;
};
// manually clean up an idea when we are done with it
exports.ideas.clean = function(idea) {
  created.push(idea.id || idea);
};
// Copied from the src ideas / I need this to test but it shouldn't be global on ideas
exports.ideas.filepath = function(id, which) {
  return config.data.location + '/' + id + '_' + which + '.json';
};
exports.ideas.exists = function(id, which) {
  var deferred = q.defer();
  if(!fs.existsSync(exports.ideas.filepath(id, which)))
    deferred.resolve(false);
  else {
    // TODO check after some time
    deferred.resolve(true);
  }
  return deferred.promise;
};


function deleteFile(id, which) {
  // Copied from the src / I need this to test but it shouldn't be global
  var path = exports.ideas.filepath(id, which);
  if(fs.existsSync(path))
    fs.unlink(path);
}

beforeEach(function() {
  doUnlink = false;
});
afterEach(function() {
  created.forEach(function(id) {
    // if we have created links for this object, then delete them
    // this allows us to remove the object completely (so we can test in an active environment)
//    deleteFile(id, 'links');
    if(doUnlink) {
      var idea = ideas.load(id);
      _.forEach(links.list, function(link) {
        idea.link(link).forEach(function(id) {
          idea.unlink(link, id);
          ideas.save(ideas.load(id));
        });
      });
      ideas.save(idea);
    }

    deleteFile(id, 'data');
  });
});