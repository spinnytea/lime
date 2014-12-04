'use strict';
// link ideas together
// these are the edges of the graph

function create(name) {
  var link = {};
  var opp = {};

  Object.defineProperty(link, 'name', { get: function() { return name; } });
  Object.defineProperty(opp, 'name', { get: function() { return name + '-opp'; } });

  Object.defineProperty(link, 'opposite', { get: function() { return opp; } });
  Object.defineProperty(opp, 'opposite', { get: function() { return link; } });

  // add the link to the list
  Object.defineProperty(exports.list, name, { enumerable: true, get: function() { return link; } });
}

exports.list = {};

// no imbedded structural meaning
// heavily used in testing
create('thought_description');


// apple
//  machintosh --typeof_of-> apple
//  gala       --typeof_of-> apple
//
// mark --typeof_of-> person
// mark --has-> apple
// person --can_has-> apple
create('type_of');
//create('has');


// helps identify when certain ideas are relevant
//
// idea --context-> ContextIdea
create('context');
