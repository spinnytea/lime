'use strict';
var config = require('../config');

// ensure settings has a place for ids
/* istanbul ignore if */
if(!config.data.ids) {
  config.data.ids = {};
  // XXX should there be some kind of init process?
  config.save();
}

var tokens = [
	'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // numbers
//		'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', // upper case letters
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', // lower case letters
];

function replaceAt(str, index, character) {
    return str.substr(0, index) + character + str.substr(index+character.length);
}

// recursively increment the value
function increment(nextID, index) {
  // if any other negative value is supplied, that will throw a StringArrayIndexOutOfBoundsException
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
      nextID = increment(nextID, index - 1); // XXX do a loop instead of recursion
    } else {
      nextID = replaceAt(nextID, index, tokens[idx]);
    }
  }
  return nextID;
}

exports.next = function(id) {
  if(typeof id !== 'string')
    throw new TypeError('id must be a string. passed: ' + (typeof id));

  // load the id saved in settings
  // or create it if it doesn't exist
  var nextID = config.data.ids[id] || tokens[0];

  // save and return the new id
  return (config.data.ids[id] = increment(nextID, nextID.length - 1));
};

// if nextID is undefined, it will start from scratch
// if nextID is defined, it must be an id previously returned
exports.next.anonymous = function(nextID) {
  nextID = nextID || tokens[0];
  return increment(nextID, nextID.length - 1);
};