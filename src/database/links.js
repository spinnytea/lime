'use strict';
var _ = require('lodash');
// link ideas together
// these are the edges of the graph

function Link() {
  // some links may have data eventually
  // things like probabilities or extra info
}
exports.Link = Link;

exports.create = function(name, undirected, options) {
  options = _.merge({
    transitive: false, // XXX add a description
  }, options);
  delete options.name;
  delete options.opposite;

  var link = _.assign({}, options);
  var opp = _.assign({}, options);

  if(!undirected) {
    Object.defineProperty(link, 'name', { get: function() { return name; } });
    Object.defineProperty(opp, 'name', { get: function() { return name + '-opp'; } });

    Object.defineProperty(link, 'opposite', { get: function() { return opp; } });
    Object.defineProperty(opp, 'opposite', { get: function() { return link; } });

    Object.defineProperty(link, 'isOpp', { value: false });
    Object.defineProperty(opp, 'isOpp', { value: true });
  } else {
    Object.defineProperty(link, 'name', { get: function() { return name; } });
    Object.defineProperty(link, 'opposite', { get: function() { return link; } });
    Object.defineProperty(link, 'isOpp', { value: false });
  }

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


// no embedded structural meaning
// used in testing
exports.create('_test__undirected_', true);


// apple
//  macintosh --typeof_of-> apple
//  gala       --typeof_of-> apple
//
// mark --typeof_of-> person
// mark --has-> apple
// person --can_has-> apple
exports.create('type_of', false, { transitive: true });
//create('has');


// appleInstance
//  apple --property-> color
//  apple --property-> dimensions
exports.create('property');


// helps identify when certain ideas are relevant
// TODO I've mostly been using these as hard coded type anchors
// - should I be using a different name?
// - context is used for ONE dynamic thing in lm-wumpus; the game instance
// - I think that one use is the true intent
//
// idea --context-> ContextIdea
exports.create('context');
