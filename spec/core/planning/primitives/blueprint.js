'use strict';
/* global describe, it, beforeEach */
var _ = require('lodash');
var expect = require('chai').expect;
var actuator = require('../../../../src/core/planning/actuator');
var blueprint = require('../../../../src/core/planning/primitives/blueprint');
var discrete = require('../../../../src/core/planning/primitives/discrete');
var number = require('../../../../src/core/planning/primitives/number');
var path = require('../../../../src/core/planning/primitives/path');
var subgraph = require('../../../../src/core/database/subgraph');
var tools = require('../../testingTools');

describe('blueprint', function() {
  describe('Action', function() {
    it('init', function() {
      // this is to ensure we test everything
      expect(Object.keys(blueprint.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply']);
      expect(_.intersection(Object.keys(blueprint.Action.prototype), Object.keys(path.Action.prototype))).to.deep.equal(Object.keys(path.Action.prototype));
    });

    // there isn't anything to test here
    // cost is the only function that lives in blueprint.Action
    // - and even that is build on runCost
    // the rest are meant to be overridden
  });

  describe('State', function() {
    it('init', function() {
      // this is to ensure we test everything
      expect(Object.keys(blueprint.State.prototype)).to.deep.equal(['distance', 'actions', 'matches']);
      expect(_.intersection(Object.keys(blueprint.State.prototype), Object.keys(path.State.prototype))).to.deep.equal(Object.keys(path.State.prototype));

      // there is no need to test matches; it's too simple
    });

    it.skip('blueprint.BlueprintState distance: this needs a complete context upgrade');
    // like, seriously. What does the distance even mean?
    // it is it primitive distance? like the change in price?
    // does difference in price have the same weight as difference in count?
    // what about type difference? how far is an apple from a pear? they are both fruits?
    // does this even matter? this should be part of the searching
    // maybe if the search says "this idea must be a fruit" then so long as it matches, then the distance is zero?
    // does this mean that primitive distance is the only thing that matters?
    describe('distance', function() {
      // only objects that transition need a distance
      // if two vertices match and aren't both transitionable or not ... actually, the subgraph won't match this
      // transitions are based primitive distance (number/discrete)
      var idea;
      var a, b;
      beforeEach(function() {
        idea = tools.ideas.create();

        a = new blueprint.State(new subgraph.Subgraph(), []);
        b = new blueprint.State(new subgraph.Subgraph(), []);
      });

      it('non-transitionable', function() {
        // there is nothing to compare
        // therefore they don't match
        expect(subgraph.match(a.state, b.state)).to.deep.equal([]);
        expect(a.distance(b)).to.equal(Infinity);

        a.state.addVertex(subgraph.matcher.id, idea);
        var v = b.state.addVertex(subgraph.matcher.id, idea);

        // now there really isn't anything to compare
        // the idea doesn't need to transition
        expect(subgraph.match(a.state, b.state).length).to.equal(1);
        expect(a.distance(b)).to.equal(0);

        // if we make b transitionable, then this should no longer be valid
        b.state.vertices[v].transitionable = true;
        expect(a.distance(b)).to.equal(Infinity);
      });

      it('numbers', function() {
        var thing = { thing: 42 };
        var n_10 = { value: number.value(10), unit: idea.id };
        var n_20 = { value: number.value(20), unit: idea.id };
        var _a = a.state.addVertex(subgraph.matcher.id, idea, true);
        var _b = b.state.addVertex(subgraph.matcher.id, idea, true);

        // init a to have a value, and b to not
        // one is a number, the other is not a number
        // how do we resolve this? the data must be invalid
        a.state.vertices[_a].data = n_10;
        b.state.vertices[_b].data = undefined;
        expect(a.state.vertices[_a].data).to.deep.equal(n_10);
        expect(b.state.vertices[_b].data).to.deep.equal(undefined);
        expect(a.distance(b)).to.equal(Infinity);
        // we should get the same result either way we compare
        expect(b.distance(a)).to.equal(Infinity);

        // if we have some data in b that isn't a number, it should be the same result
        b.state.vertices[_b].data = thing;
        expect(b.state.vertices[_b].data).to.deep.equal(thing);
        expect(a.distance(b)).to.equal(Infinity);
        expect(b.distance(a)).to.equal(Infinity);

        // if we put a number in b, our distance should work
        b.state.vertices[_b].data = n_10;
        expect(b.state.vertices[_b].data).to.deep.equal(n_10);
        expect(a.distance(b)).to.equal(0);
        expect(b.distance(a)).to.equal(0);
        b.state.vertices[_b].data = n_20;
        expect(b.state.vertices[_b].data).to.deep.equal(n_20);
        expect(a.distance(b)).to.equal(10);
        expect(b.distance(a)).to.equal(10);
      });

      it('discrete', function() {
        var thing = { thing: 42 };
        var boolean = discrete.definitions.create(['true', 'false']);
        tools.ideas.clean(boolean);
        var t = { value: 'true', unit: boolean.id };
        var f = { value: 'false', unit: boolean.id };
        var _a = a.state.addVertex(subgraph.matcher.id, idea, true);
        var _b = b.state.addVertex(subgraph.matcher.id, idea, true);

        // init a to have a value, and b to not
        // one is a discrete, the other is not a discrete
        // how do we resolve this? the data must be invalid
        a.state.vertices[_a].data = t;
        b.state.vertices[_b].data = undefined;
        expect(a.state.vertices[_a].data).to.deep.equal(t);
        expect(b.state.vertices[_b].data).to.deep.equal(undefined);
        expect(a.distance(b)).to.equal(Infinity);
        // we should get the same result either way we compare
        expect(b.distance(a)).to.equal(Infinity);

        // if we have some data in b that isn't discrete, it should be the same result
        b.state.vertices[_b].data = thing;
        expect(b.state.vertices[_b].data).to.deep.equal(thing);
        expect(a.distance(b)).to.equal(Infinity);
        expect(b.distance(a)).to.equal(Infinity);

        // if we put a discrete in b, our distance should work
        b.state.vertices[_b].data = t;
        expect(b.state.vertices[_b].data).to.deep.equal(t);
        expect(a.distance(b)).to.equal(0);
        expect(b.distance(a)).to.equal(0);
        b.state.vertices[_b].data = f;
        expect(b.state.vertices[_b].data).to.deep.equal(f);
        expect(a.distance(b)).to.equal(1);
        expect(b.distance(a)).to.equal(1);
      });

      it('<any>', function() {
        var t_1 = { thing: 42 };
        var t_2 = { thing: 3.14 };
        var _a = a.state.addVertex(subgraph.matcher.id, idea, true);
        var _b = b.state.addVertex(subgraph.matcher.id, idea, true);

        a.state.vertices[_a].data = undefined;
        b.state.vertices[_b].data = undefined;

        // they are both transitionable and the data matches
        // (even though the data is undefined, it's the same)
        expect(a.distance(b)).to.equal(0);

        // so change the data in one of them
        b.state.vertices[_b].data = t_1;
        expect(b.state.vertices[_b].data).to.deep.equal(t_1);
        expect(a.distance(b)).to.equal(1);
        expect(b.distance(a)).to.equal(1);

        // and data in both
        a.state.vertices[_a].data = t_2;
        expect(a.state.vertices[_a].data).to.deep.equal(t_2);
        expect(a.distance(b)).to.equal(1);
        expect(b.distance(a)).to.equal(1);

        // and matching data
        a.state.vertices[_a].data = t_1;
        expect(a.state.vertices[_a].data).to.deep.equal(t_1);
        expect(a.distance(b)).to.equal(0);
        expect(b.distance(a)).to.equal(0);
      });
    }); // end distance

    it('actions', function() {
      var idea_1 = tools.ideas.create();

      var bs = new blueprint.State(new subgraph.Subgraph(), []);
      var a = new actuator.Action();
      var a_i1 = a.requirements.addVertex(subgraph.matcher.id, idea_1, true);
      a.transitions.push({vertex_id: a_i1, replace: { thing: 42 }});

      // no actions and no state
      expect(bs.actions()).to.deep.equal([]);

      // what happens when you have actions but no prereqs
      // there is no match in the reqs
      bs.availableActions.push(a);
      expect(bs.actions()).to.deep.equal([]);

      // now if we have something in the state, but no actions
      bs.availableActions.splice(0);
      bs.state.addVertex(subgraph.matcher.id, idea_1, true);
      expect(bs.actions()).to.deep.equal([]);

      // and finally, if there is a state and action
      bs.availableActions.push(a);
      expect(bs.actions().length).to.equal(1);

      // the point of this isn't to unit test the actuator
    });
  }); // end State
}); // end blueprint