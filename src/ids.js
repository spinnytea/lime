'use strict';
var config = require('./config');

// if id is undefined, it will start from 0 (first id is 1)
// if id is defined, it must be an id previously returned
exports.anonymous = function(nextID) {
  return increment(nextID || '');
};

// get the next value of a managed id
exports.next = function(key) {
  if(typeof key !== 'string' || !key.length)
    throw new TypeError('key must be a string. passed: ' + (typeof key));

  // load the id saved in settings
  // or create it if it doesn't exist
  var nextID = config.data.ids[key] || exports.units.tokens[0];

  // save and return the new id
  return (config.data.ids[key] = increment(nextID, nextID.length - 1));
};


Object.defineProperty(exports, 'units', { value: {} });
exports.units.tokens = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // numbers
  //'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', // upper case letters
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', // lower case letters
];
exports.units.replaceAt = replaceAt;
exports.units.increment = increment;

function replaceAt(str, index, character) {
    return str.substr(0, index) + character + str.substr(index+character.length);
}

function increment(nextID) {
  var tokens = exports.units.tokens;
  var index = nextID.length-1;

  while(index > -2) {
    if(index === -1) {
      nextID = tokens[1] + nextID;
    } else {
      // get the next token index
      var idx = tokens.indexOf(nextID.charAt(index)) + 1;

      // if we can't increase that anymore, then increase the next value
      if(idx === tokens.length) {
        // increment the value before recursion
        // when we roll over (99 -> 100), our index will be off by one
        nextID = replaceAt(nextID, index, tokens[0]);
      } else {
        nextID = replaceAt(nextID, index, tokens[idx]);
        index = -1;
      }
    }
    index--;
  }

  return nextID;
}


/* istanbul ignore next */
config.onInit(function() {
  // ensure settings has a place for ids
  if(!config.data.ids) {
    config.data.ids = {};
  }
});
