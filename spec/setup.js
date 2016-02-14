'use strict';
var config = require('../src/config');

before(function() {
  config.init({
    //location: '/Volumes/MyPassport/lime database',
    location: '/Volumes/RAM Disk',
  });
});