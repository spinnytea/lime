'use strict';
var expect = require('chai').expect;
var discrete = require('../../../src/planning/primitives/discrete');
var links = require('../../../src/database/links');
var number = require('../../../src/planning/primitives/number');
var subgraph = require('../../../src/database/subgraph');

describe('subgraph', function() {
  var sg, a, b, c, a_b, a_c;
  before(function() {
    sg = new subgraph.Subgraph();
    a = sg.addVertex(subgraph.matcher.filler);
    b = sg.addVertex(subgraph.matcher.filler, undefined, { transitionable: true });
    c = sg.addVertex(subgraph.matcher.filler, undefined);
    a_b = sg.addEdge(a, links.list.thought_description, b);
    a_c = sg.addEdge(a, links.list.thought_description, c, { transitionable: true });
  });

  afterEach(function() {
    sg.deleteData(b);
  });

  describe('rewrite', function() {
    it('init', function() {
      expect(Object.keys(subgraph.rewrite.units)).to.deep.equal(['checkVertex', 'transitionVertex', 'checkEdge', 'transitionEdge']);
    });

    describe('checkVertex', function() {
      var checkVertex = subgraph.rewrite.units.checkVertex;

      it('not for vertices', function() {
        expect(checkVertex(sg)).to.equal(false);
        expect(checkVertex(sg, undefined)).to.equal(false);
        expect(checkVertex(sg, {})).to.equal(false);
        expect(checkVertex(sg, { replace_id: '_test' })).to.equal(false);
        expect(checkVertex(sg, { edge_id: '_test' })).to.equal(false);
      });

      it('invalid transition', function() {
        expect(checkVertex(sg, { vertex_id: a, invalid: null })).to.equal(false);
      });

      it('vertex does not exist', function() {
        expect(checkVertex(sg, { vertex_id: '_invalid', replace: {} })).to.equal(false);
      });

      it('not transitionable', function() {
        expect(checkVertex(sg, { vertex_id: a, replace: {} })).to.equal(false);
      });

      it('no data to transition', function() {
        expect(checkVertex(sg, { vertex_id: b, replace: {} })).to.equal(false);
      });

      it('replace', function() {
        // can replace any data
        // only need to check the units when they mismatch
        sg.setData(b, 'no unit');
        expect(checkVertex(sg, { vertex_id: b, replace: { value: number.value(20), unit: '_test' } })).to.equal(true);
        sg.setData(b, { value: number.value(10), unit: '_test' });
        expect(checkVertex(sg, { vertex_id: b, replace: {} })).to.equal(true);
        expect(checkVertex(sg, { vertex_id: b, replace: { value: number.value(20), unit: '_mismatch' } })).to.equal(false);
        expect(checkVertex(sg, { vertex_id: b, replace: { value: number.value(20), unit: '_test' } })).to.equal(true);
      });

      it.skip('replace_id', function() {
        sg.setData(b, 'not unit');
        void(discrete);
      });

      it.skip('cycle');

      it('combine', function() {
        sg.setData(b, {});
        expect(checkVertex(sg, { vertex_id: b, combine: { value: number.value(20), unit: '_test' } })).to.equal(false);
        sg.setData(b, { value: number.value(10), unit: '_test' });
        expect(checkVertex(sg, { vertex_id: b, combine: {} })).to.equal(false);
        expect(checkVertex(sg, { vertex_id: b, combine: { value: number.value(20), unit: '_mismatch' } })).to.equal(false);
        expect(checkVertex(sg, { vertex_id: b, combine: { value: number.value(20), unit: '_test' } })).to.equal(true);
      });
    }); // end checkVertex

    it.skip('transitionVertex');

    it.skip('checkEdge');

    it.skip('transitionEdge');
  }); // end rewrite
}); // end subgraph