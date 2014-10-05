'use strict';
/* global describe, it */
var expect = require('chai').expect;
var config = require('../../config');
var ids = require('../../src/core/ids');

// copied from the src
var tokens = [
	'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // numbers
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', // lower case letters
];

describe('ids', function() {
  it('init', function() {
    expect(ids).to.be.an('object');
    expect(ids.next).to.be.a('function');
    expect(config.settings.ids).to.be.an('object');
  });

  it('increment', function() {
    // the value should not be defined
    expect(config.settings.ids.testing).to.not.be.ok;

    // an id must be supplied to next
    expect(function() { ids.next(); }).to.throw(TypeError);
    
		// set of single digits
		tokens.slice(1).forEach(function(token) {
			expect(ids.next('testing')).to.equal(token);
		});

    expect(config.settings.ids.testing).to.equal('z');

		// set of double digits
		tokens.slice(1).forEach(function(i) {
      tokens.forEach(function(j) {
        expect(ids.next('testing')).to.equal(i+j);
      });
		});

    expect(config.settings.ids.testing).to.equal('zz');

		// set of triple digits
		tokens.slice(1).forEach(function(i) {
      tokens.forEach(function(j) {
        tokens.forEach(function(k) {
          expect(ids.next('testing')).to.equal(i+j+k);
        });
      });
		});

    expect(config.settings.ids.testing).to.equal('zzz');
    expect(ids.next('testing')).to.equal('1000');
    expect(config.settings.ids.testing).to.equal('1000');

    delete config.settings.ids.testing;
    expect(config.settings.ids).to.be.ok;
  }); // end increment
});