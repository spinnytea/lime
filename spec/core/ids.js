'use strict';
/* global describe, it */
var expect = require('chai').expect;
var ids = require('../../src/core/ids');

// copied from the src
var tokens = [
	'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // numbers
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', // lower case letters
];

describe.only('ids', function() {
  it('init', function() {
    expect(ids).to.be.an('object');
    expect(ids.next).to.be.ok;
  });

  it('increment', function() {
    // an id must be supplied to next
    expect(function() { ids.next(); }).to.throw(TypeError);
    
		// set of single digits
		tokens.slice(1).forEach(function(token) {
			expect(ids.next('testing')).to.equal(token);
		});

		// set of double digits
		tokens.slice(1).forEach(function(i) {
      tokens.forEach(function(j) {
        expect(ids.next('testing')).to.equal(i+j);
      });
		});

		// set of triple digits
		tokens.slice(1).forEach(function(i) {
      tokens.forEach(function(j) {
        tokens.forEach(function(k) {
          expect(ids.next('testing')).to.equal(i+j+k);
        });
      });
		});
  }); // end increment
});