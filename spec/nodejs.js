'use strict';
var expect = require('chai').expect;
var Promise = require('bluebird');

// Sometimes I want to verify an interface
// Sometimes the way I am using something doesn't seem "standard"
// these tests are just place for me to verify that the language does what I think it does

describe('nodejs', function() {
  describe('javascript', function() {
    it('[].find', function() {
      // find is part of ES6, and supported by node --harmony
      // (e.g. gulp --harmony mocha)
      expect(Array.prototype.find).to.be.a('function');
      expect([].find).to.be.a('function');
      // finds the first object (state test? not a contract test?)
      expect([{a: 1, b: 1}, {a: 1, b: 2}].find(function(o) { return o.a===1; })).to.deep.equal({a: 1, b: 1});
    });
  }); // end javascript

  describe('Promise (bluebird)', function() {
    it('redo promise on failure', function(done) {
      var p = Promise.reject();
      var count = 0;

      // first, we go to the failure case
      p = p.then(function() {
        expect('this is the path').to.equal('this is NOT the path');
      }, function() {
        expect('this is the path').to.equal('this is the path');
        count++;
        return Promise.resolve();
      }).catch(done);

      // now we should be in the success case
      p = p.then(function() {
        expect('this is the path').to.equal('this is the path');
        count++;
      }, function() {
        expect('this is the path').to.equal('this is NOT the path');
      }).catch(done);

      p = p.then(function() {
        expect(count).to.equal(2);
        //console.log(count);
      });

      p.then(done, done);
    });
  }); // end Promise
}); // end nodejs
