'use strict';
var expect = require('chai').expect;
var ids = require('../src/ids');

describe('ids', function() {
  it('init', function() {
    expect(Object.keys(ids.units)).to.deep.equal(['tokens', 'replaceAt', 'increment']);
  });

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
    var increment = ids.units.increment;

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
      expect(increment('z')).to.equal('10');
      expect(increment('zz')).to.equal('100');
      expect(increment('zzz')).to.equal('1000');
    });

    it('invalid characters', function() {
      expect(function() { increment('%'); }).to.throw('invalid character in id');
      expect(function() { increment('2%z'); }).to.throw('invalid character in id');

      // not supported, but I proof that we are not checking the whole string
      expect(increment('2%a')).to.equal('2%b');
    });
  }); // end increment
}); // end ids