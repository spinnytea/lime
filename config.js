'use strict';
var fs = require('fs');

// the database
exports.data = {
  // the root location of the database
  location: '/Volumes/MyPassport/lime database',

  // TODO astar_max_paths is an initial seed value, can/should we adjust it at runtime? Or does this operate at too low of a level
  astar_max_paths: 100,
};

// a settings file store in the database
// "config" is static; settings can be updated and saved
if(fs.existsSync(exports.data.location + '/_settings.json'))
  exports.settings = fs.readFileSync(exports.data.location + '/_settings.json', {encoding: 'utf8'});
else
  exports.settings = {};
// TODO save on exit
exports.save = function() {
  fs.writeFile(exports.data.location + '/_settings.json', exports.settings, {encoding: 'utf8'});
};
