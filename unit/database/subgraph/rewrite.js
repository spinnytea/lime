'use strict';
var expect = require('chai').expect;
var rewrite = require('../../../src/database/subgraph').rewrite;

describe('subgraph', function() {
  describe('rewrite', function() {
    it('init', function() {
      expect(Object.keys(rewrite.units)).to.deep.equal(['checkVertex', 'transitionVertex', 'checkEdge', 'transitionEdge']);
    });

    it.skip('checkVertex');

    it.skip('transitionVertex');

    it.skip('transitionEdge');

    it.skip('checkVertex');
  }); // end rewrite
}); // end subgraph