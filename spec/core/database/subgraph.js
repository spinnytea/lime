'use strict';
/* global describe, it */
var expect = require('chai').expect;
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe.only('subgraph', function() {
  describe('matchers', function() {
    it('id: function', function() {
      var idea = tools.ideas.create();

      expect(subgraph.matcher.id(idea, idea.id)).to.equal(true);
      expect(subgraph.matcher.id(idea, '')).to.equal(false);
    });

    it.skip('id: basic search');

    it('filler: function', function() {
      expect(subgraph.matcher.filler()).to.equal(true);
      expect(subgraph.matcher.filler(undefined, '')).to.equal(true);
      expect(subgraph.matcher.filler('', 134)).to.equal(true);
    });

    it.skip('filler: basic search');

    describe('data', function() {
      it('exact: function', function() {
        var idea = tools.ideas.create({'thing': 3.14});

        expect(subgraph.matcher.data.exact(idea, {'thing': 3.14})).to.equal(true);
        expect(subgraph.matcher.data.exact(idea, {'thing': 6.28})).to.equal(false);
        expect(subgraph.matcher.data.exact(idea, {})).to.equal(false);
      });

      it.skip('exact: basic search');

      it('similar: function', function() {
        var idea = tools.ideas.create({'thing1': 3.14, 'thing2': 2.71});

        expect(subgraph.matcher.data.similar(idea, {'thing1': 3.14})).to.equal(true);
        expect(subgraph.matcher.data.similar(idea, {'thing2': 2.71})).to.equal(true);
        expect(subgraph.matcher.data.similar(idea, {})).to.equal(true);
        expect(subgraph.matcher.data.similar(idea)).to.equal(true);
        expect(subgraph.matcher.data.similar(idea, {'thing2': 42})).to.equal(false);
        expect(subgraph.matcher.data.similar(idea, {'others': 42})).to.equal(false);

        // the data shouldn't have been changed after any of this
        expect(idea.data()).to.deep.equal({'thing1': 3.14, 'thing2': 2.71});
      });

      it.skip('similar: basic search');
    }); // end data
  }); // end matchers
}); // end subgraph