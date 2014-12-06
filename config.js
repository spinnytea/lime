'use strict';
var fs = require('fs');

// the database
// config.settings are static
exports.settings = {
  // the root location of the database
  location: '/Volumes/MyPassport/lime database',

  // TODO astar_max_paths is an initial seed value, can/should we adjust it at runtime? Or does this operate at too low of a level
  // XXX if we increase this number
  // - we should add some logic to prevent duplicate states
  // - (maybe we should anyway?)
  astar_max_paths: 100,
};

// a settings file store in the database
// config.data can be updated and saved
if(fs.existsSync(exports.settings.location + '/_settings.json'))
  exports.data = JSON.parse(fs.readFileSync(exports.settings.location + '/_settings.json', {encoding: 'utf8'}));
else
  exports.data = {};
// TODO save on exit
// TODO race condition: sometimes nothing saves when it saves too often
var writing = false;
var writeAgain = false;
exports.save = function() {
  if(writing) {
    writeAgain = true;
  } else {
    writing = true;
    fs.writeFile(exports.settings.location + '/_settings.json', JSON.stringify(exports.data), {encoding: 'utf8'}, function() {
      writing = false;
      if(writeAgain)
        exports.save();
      writeAgain = false;
    });
  }
};
