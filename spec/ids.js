'use strict';
var expect = require('chai').expect;
var config = require('../src/config');
var ids = require('../src/ids');

describe('ids', function() {
  it('init', function() {
    expect(Object.keys(ids)).to.deep.equal(['anonymous', 'next']);
    expect(Object.keys(ids.units)).to.deep.equal(['tokens', 'replaceAt', 'increment']);

    expect(config.data.ids).to.be.an('object');
  });

  it('anonymous', function() {
    expect(ids.anonymous('')).to.equal('1');
    expect(ids.anonymous('12')).to.equal('13');
    expect(ids.anonymous('az')).to.equal('b0');
    expect(ids.anonymous(ids.anonymous(''))).to.equal('2');
  });

  it('anonymous does not store keys', function() {
    var keysBefore = Object.keys(config.data.ids);
    ids.anonymous('12');
    expect(Object.keys(config.data.ids)).to.deep.equal(keysBefore);
  });

  it('next', function() {
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

  it('next only accepts keys', function() {
    expect(function() { ids.next(undefined); }).to.throw('key must be a string');
    expect(function() { ids.next(null); }).to.throw('key must be a string');
    expect(function() { ids.next(0); }).to.throw('key must be a string');
    expect(function() { ids.next({}); }).to.throw('key must be a string');
    expect(function() { ids.next({key: 'things'}); }).to.throw('key must be a string');
    expect(function() { ids.next(''); }).to.throw('key must be a string');
  });

  describe('units', function() {
    it('tokens', function() {
      var tokens = ids.units.tokens;

      // 36 doesn't really matter, but it's good to know
      expect(tokens.length).to.equal(36);

      // not file systems are case sensitive
      // since our primary way of storing data will be to write files, we need to limit our character set
      expect(tokens.map(function(s) { return s.toLowerCase(); })).to.deep.equal(tokens);

      // I like to use underscores for special IDs, so we need to make sure the normally generated IDs can't overlap with them
      expect(tokens.indexOf('a')).to.not.equal(-1); // make sure our search works
      expect(tokens.indexOf('_')).to.equal(-1); // perform the test
    });

    it('replaceAt', function() {
      var replaceAt = ids.units.replaceAt;

      expect(replaceAt('1234', 0, 'a')).to.equal('a234');
      expect(replaceAt('1234', 1, 'a')).to.equal('1a34');
      expect(replaceAt('1234', 2, 'a')).to.equal('12a4');
      expect(replaceAt('1234', 3, 'a')).to.equal('123a');
    });

    describe('increment', function() {
      var tokens_bak;
      var increment = ids.units.increment;
      before(function() {
        tokens_bak = ids.units.tokens;
        ids.units.tokens = ['0', '1', '2'];
      });
      after(function() {
        ids.units.tokens = tokens_bak;
      });

      it('initial', function() {
        expect(increment('')).to.equal('1');
      });

      it('normal', function() {
        expect(increment('0')).to.equal('1');
        expect(increment('1')).to.equal('2');
        expect(increment('10')).to.equal('11');
        expect(increment('11')).to.equal('12');
      });

      it('rollover', function() {
        expect(increment('2')).to.equal('10');
        expect(increment('22')).to.equal('100');
        expect(increment('222')).to.equal('1000');
        expect(increment('2222')).to.equal('10000');
      });
    }); // end increment

    describe('unsupported', function() {
      it('increment: invalid characters', function() {
        expect(ids.units.increment('%')).to.equal('0');
        expect(ids.units.increment('2%z', 1)).to.equal('200');
      });
    }); // end unsupported
  }); // end units
}); // end ids