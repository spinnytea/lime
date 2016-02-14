'use strict';
var _ = require('lodash');
var fs = require('fs');

// the database
// config.settings are static
exports.settings = {
  // the root location of the database
  //location: '/Volumes/MyPassport/lime database',
  //location: '/Volumes/Learning Machine Source/git/lm-wumpus/todo_database',
  //location: '/Volumes/RAM Disk',
  get location() { throw new Error('must overwrite "location" (the location of the idea database)'); },

  // if there is an implementation to erase a database,
  // then this is a flag that should be honored
  do_not_erase: false,

  // TODO astar_max_paths is an initial seed value, can/should we adjust it at runtime? Or does this operate at too low of a level
  // XXX if we increase this number
  // - we should add some logic to prevent duplicate states
  // - (maybe we should anyway?)
  astar_max_paths: 100
};

var hasInit = false;
var onInit = [];
exports.onInit = function(fn) {
  onInit.push(fn);
  if(hasInit) fn();
};
exports.init = function(projectConfig) {
  if(projectConfig.location) delete exports.settings.location;
  _.assign(exports.settings, projectConfig);

  // a settings file stored 'in the database'
  // XXX even when this program becomes distributed, config.data needs to be a singleton across all nodes
  // - it stores init-time constants and generated ids
  // config.data can be updated and saved
  if(fs.existsSync(exports.settings.location + '/_settings.json'))
    exports.data = JSON.parse(fs.readFileSync(exports.settings.location + '/_settings.json', {encoding: 'utf8'}));
  else
    exports.data = {};

  hasInit = true;
  onInit.forEach(function(fn) { fn(); });
};

// TODO save on exit
var saveTimeout;
var writing = false;
exports.save = function() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(function() {
    // if we are currently writing something, redo the timeout
    if(writing)
      exports.save();

    writing = true;
    fs.writeFile(
      exports.settings.location + '/_settings.json',
      JSON.stringify(exports.data),
      {encoding: 'utf8'},
      function() { writing = false; }
    );
  }, 1000);
};
