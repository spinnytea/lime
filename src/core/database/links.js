'use strict';

function create(name) {
  var link = {};
  var opp = {};

  Object.defineProperty(link, 'name', { get: function() { return name; } });
  Object.defineProperty(opp, 'name', { get: function() { return name + '-opp'; } });

  Object.defineProperty(link, 'opposite', { get: function() { return opp; } });
  Object.defineProperty(opp, 'opposite', { get: function() { return link; } });

  // add the link to the list
  Object.defineProperty(exports.list, name, { get: function() { return link; } });
}

exports.list = {};
create('thought_description');
