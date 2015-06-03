'use strict';
// link ideas together
// these are the edges of the graph

exports.create = function(name) {
  var link = {};
  var opp = {};

  Object.defineProperty(link, 'name', { get: function() { return name; } });
  Object.defineProperty(opp, 'name', { get: function() { return name + '-opp'; } });

  Object.defineProperty(link, 'opposite', { get: function() { return opp; } });
  Object.defineProperty(opp, 'opposite', { get: function() { return link; } });

  // add the link to the list
  Object.defineProperty(exports.list, name, { enumerable: true, get: function() { return link; } });
};

exports.list = {
  // listing them out here lets the IDE know that they exist
  thought_description: undefined,
  type_of: undefined,
  property: undefined,
  context: undefined
};

// no embedded structural meaning
// heavily used in testing
exports.create('thought_description');


// apple
//  macintosh --typeof_of-> apple
//  gala       --typeof_of-> apple
//
// mark --typeof_of-> person
// mark --has-> apple
// person --can_has-> apple
exports.create('type_of');
//create('has');


// appleInstance
//  apple --property-> color
//  apple --property-> dimensions
exports.create('property');


// helps identify when certain ideas are relevant
//
// idea --context-> ContextIdea
exports.create('context');
