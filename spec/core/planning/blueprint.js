'use strict';
/* global describe, it */
var expect = require('chai').expect;
var blueprint = require('../../../src/core/planning/primitives/blueprint');

describe.skip('blueprint', function() {
  describe('Action', function() {
    it('init', function() {
      // this is to ensure we test everything
      expect(Object.keys(blueprint.Action.prototype)).to.deep.equal([]);
//      expect(_.intersection(Object.keys(NumberSlide.Action.prototype), Object.keys(path.Action.prototype))).to.deep.equal(Object.keys(path.Action.prototype));
    });
  });

  describe('State', function() {
    it('init', function() {
      // this is to ensure we test everything
      expect(Object.keys(blueprint.State.prototype)).to.deep.equal([]);
//      expect(_.intersection(Object.keys(NumberSlide.State.prototype), Object.keys(path.State.prototype))).to.deep.equal(Object.keys(path.State.prototype));
    });
  });

  it.skip('blueprint.BlueprintAction is a path.Action'); // combine with init
  it.skip('blueprint.BlueprintState is a path.State'); // combine with init

  it.skip('blueprint.BlueprintState distance');
  it.skip('blueprint.BlueprintState distance: this needs a complete context upgrade');
  // like, seriously. What does the distance even mean?
  // it is it primitive distance? like the change in price?
  // does difference in price have the same weight as difference in count?
  // what about type difference? how far is an apple from a pear? they are both fruits?
  // does this even matter? this should be part of the searching
  // maybe if the search says "this idea must be a fruit" then so long as it matches, then the distance is zero?
  // does this mean that primitive distance is the only thing that matters?

  it.skip('AC: subgraph.match: i.transitionable === o.transitionable');
  // try to match subgraphs with 00, 01, 10, 11 transitionable states
  // ... or is it fine having the if statement in the blueprint.State.distance?
});