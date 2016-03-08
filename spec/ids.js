'use strict';
var expect = require('chai').expect;
var config = require('../src/config');
var ids = require('../src/ids');

describe('ids', function() {
  it('init', function() {
    expect(Object.keys(ids)).to.deep.equal(['anonymous', 'next']);

    expect(config.data.ids).to.be.an('object');
  });

  describe('anonymous', function() {
    it('happy', function() {
      expect(ids.anonymous('')).to.equal('1');
      expect(ids.anonymous('12')).to.equal('13');
      expect(ids.anonymous('aa')).to.equal('ab');
      expect(ids.anonymous(ids.anonymous(''))).to.equal('2');
    });

    it('anonymous does not store keys', function() {
      var keysBefore = Object.keys(config.data.ids);
      ids.anonymous('12');
      expect(Object.keys(config.data.ids)).to.deep.equal(keysBefore);
    });
  }); // end anonymous

  describe('next', function() {
    it('happy', function() {
      var key = '_test_';
      expect(config.data.ids).not.to.have.property(key);

      expect(ids.next(key)).to.equal('1');
      expect(ids.next(key)).to.equal('2');
      expect(ids.next(key)).to.equal('3');

      expect(config.data.ids).to.have.property(key);

      // cleanup
      delete config.data.ids[key];
      expect(config.data.ids).not.to.have.property(key);
    });

    it('only accepts keys', function() {
      expect(function() { ids.next(undefined); }).to.throw('key must be a string');
      expect(function() { ids.next(null); }).to.throw('key must be a string');
      expect(function() { ids.next(0); }).to.throw('key must be a string');
      expect(function() { ids.next({}); }).to.throw('key must be a string');
      expect(function() { ids.next({key: 'things'}); }).to.throw('key must be a string');
      expect(function() { ids.next(''); }).to.throw('key must be a string');
    });
  }); // end next
}); // end ids