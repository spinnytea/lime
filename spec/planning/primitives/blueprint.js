'use strict';
var _ = require('lodash');
var expect = require('chai').use(require('sinon-chai')).expect;
var sinon = require('sinon');
var actuator = require('../../../src/planning/actuator');
var blueprint = require('../../../src/planning/primitives/blueprint');
var discrete = require('../../../src/planning/primitives/discrete');
var ideas = require('../../../src/database/ideas');
var links = require('../../../src/database/links');
var number = require('../../../src/planning/primitives/number');
var path = require('../../../src/planning/primitives/path');
var subgraph = require('../../../src/database/subgraph');

describe('blueprint', function() {
  require('../../database/ideas').mock();
  
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(blueprint)).to.deep.equal(['loaders', 'load', 'Action', 'State', 'context', 'list']);
    // there isn't a need to test loaders directly
    // when we test the load of actuator, serialplan, etc then loaders will be tested through them
    // we can't test list without anything to retrieve; this will be tested in the prototypes that need it
    expect(blueprint.context).to.not.equal(undefined);

    expect(Object.keys(blueprint.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint', 'scheduleBlueprint', 'cost', 'apply', 'save', 'prepSave']);
    expect(_.intersection(Object.keys(blueprint.Action.prototype), Object.keys(path.Action.prototype))).to.deep.equal(Object.keys(path.Action.prototype));
    // there isn't anything to test here
    // cost is the only function that lives in blueprint.Action
    // - and even that is build on runCost
    // the rest are meant to be overridden

    expect(Object.keys(blueprint.State.prototype)).to.deep.equal(['distance', 'actions', 'matches']);
    expect(_.intersection(Object.keys(blueprint.State.prototype), Object.keys(path.State.prototype))).to.deep.equal(Object.keys(path.State.prototype));
    // there is no need to test matches; it's too simple
  });

  // this is just a basic test
  // it still needs to be tested for each of the implementing prototypes
  it('load', function() {
    var idea = ideas.create({ });

    blueprint.loaders.test = sinon.stub().returns('banana');
    expect(blueprint.loaders.test).to.have.callCount(0);

    expect(blueprint.load(idea.id)).to.equal(undefined);
    expect(blueprint.loaders.test).to.have.callCount(0);

    idea.update({ type: 'blueprint', subtype: 'test', blueprint: {} });
    expect(blueprint.load(idea.id)).to.equal('banana');
    expect(blueprint.loaders.test).to.have.callCount(1);
  });

  it.skip('load(undefined)', function() {
    // should this always return undefined?
    // should this throw a type error?
    // is there ever a situation where we want AAALLLL the actions?
    // we people NEED to have a heirarchy of some kind, or load domain-specific actions
    // right?
  });

  describe('State', function() {
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
        idea = ideas.create();

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
        b.state.getMatch(v).options.transitionable = true;
        expect(a.distance(b)).to.equal(Infinity);
      });

      describe('transitionable 101', function() {
        it.skip('i && !o'); // straight up failure

        it.skip('!i && !o'); // and there is a difference

        it.skip('i && o'); // standard

        // standard differences
        // it says that the target doesn't care about the change
        // but it still needs to match, so we still care about the diff
        it.skip('!i && o');
      });

      describe('concrete', function() {
        it('number', function() {
          var thing = { thing: 42 };
          var n_10 = { value: number.value(10), unit: idea.id };
          var n_20 = { value: number.value(20), unit: idea.id };
          var _a = a.state.addVertex(subgraph.matcher.id, idea, {transitionable:true});
          var _b = b.state.addVertex(subgraph.matcher.id, idea, {transitionable:true});

          // init a to have a value, and b to not
          // one is a number, the other is not a number
          // how do we resolve this? the data must be invalid
          a.state.setData(_a, n_10);
          b.state.deleteData(_b);
          expect(a.distance(b)).to.equal(Infinity);
          // we should get the same result either way we compare
          expect(b.distance(a)).to.equal(Infinity);

          // if we have some data in b that isn't a number, it should be the same result
          b.state.setData(_b, thing);
          expect(a.distance(b)).to.equal(Infinity);
          expect(b.distance(a)).to.equal(Infinity);

          // if we put a number in b, our distance should work
          b.state.setData(_b, n_10);
          expect(a.distance(b)).to.equal(0);
          expect(b.distance(a)).to.equal(0);
          b.state.setData(_b, n_20);
          expect(a.distance(b)).to.equal(10);
          expect(b.distance(a)).to.equal(10);
        });

        it('discrete', function() {
          var thing = { thing: 42 };
          var t = { value: true, unit: discrete.definitions.list.boolean };
          var f = { value: false, unit: discrete.definitions.list.boolean };
          var _a = a.state.addVertex(subgraph.matcher.id, idea, {transitionable:true});
          var _b = b.state.addVertex(subgraph.matcher.id, idea, {transitionable:true});

          // init a to have a value, and b to not
          // one is a discrete, the other is not a discrete
          // how do we resolve this? the data must be invalid
          a.state.setData(_a, t);
          b.state.deleteData(_b);
          expect(a.distance(b)).to.equal(Infinity);
          // we should get the same result either way we compare
          expect(b.distance(a)).to.equal(Infinity);

          // if we have some data in b that isn't discrete, it should be the same result
          b.state.setData(_b, thing);
          expect(a.distance(b)).to.equal(Infinity);
          expect(b.distance(a)).to.equal(Infinity);

          // if we put a discrete in b, our distance should work
          b.state.setData(_b, t);
          expect(a.distance(b)).to.equal(0);
          expect(b.distance(a)).to.equal(0);
          b.state.setData(_b, f);
          expect(a.distance(b)).to.equal(1);
          expect(b.distance(a)).to.equal(1);
        });

        it('<any>', function() {
          var t_1 = { thing: 42 };
          var t_2 = { thing: 3.14 };
          var _a = a.state.addVertex(subgraph.matcher.id, idea, {transitionable:true});
          var _b = b.state.addVertex(subgraph.matcher.id, idea, {transitionable:true});

          a.state.deleteData(_a);
          b.state.deleteData(_b);

          // they are both transitionable and the data matches
          // (even though the data is undefined, it's the same)
          expect(a.distance(b)).to.equal(0);

          // so change the data in one of them
          b.state.setData(_b, t_1);
          expect(a.distance(b)).to.equal(1);
          expect(b.distance(a)).to.equal(1);

          // and data in both
          a.state.setData(_a, t_2);
          expect(a.distance(b)).to.equal(1);
          expect(b.distance(a)).to.equal(1);

          // and matching data
          a.state.setData(_a, t_1);
          expect(a.distance(b)).to.equal(0);
          expect(b.distance(a)).to.equal(0);
        });

        it('matcher: similar', function() {
          var data_outer = { thing1: 1, thing2: 2 };
          var data_inner = { thing1: 1 };

          var idea2 = ideas.create(data_outer);
          idea.link(links.list.thought_description, idea2);

          a.state.addEdge(
            a.state.addVertex(subgraph.matcher.id, idea),
            links.list.thought_description,
            a.state.addVertex(subgraph.matcher.id, idea2)
          );

          b.state.addEdge(
            b.state.addVertex(subgraph.matcher.id, idea),
            links.list.thought_description,
            b.state.addVertex(subgraph.matcher.similar, data_inner)
          );

          expect(a.distance(b)).to.equal(0);
          expect(function() { b.distance(a); }).to.throw(Error);
        });
      }); // end concrete

      describe('inconcrete', function() {
        it.skip('number');

        it.skip('discrete');

        it.skip('<any>');

        it.skip('matcher: similar');
      }); // end inconcrete

      describe('matchRef', function() {
        it('basic', function() {
          // idea --links to--> idea2
          var idea2 = ideas.create();
          idea.link(links.list.thought_description, idea2);

          // concrete subgraph of idea-->idea2
          a.state.addEdge(
            a.state.addVertex(subgraph.matcher.id, idea),
            links.list.thought_description,
            a.state.addVertex(subgraph.matcher.id, idea2, {transitionable:true})
          );

          // inconcrete matchRef of idea--?
          var _b1 = b.state.addVertex(subgraph.matcher.id, idea);
          var _b2 = b.state.addVertex(subgraph.matcher.number, _b1, {transitionable:true,matchRef:true});
          b.state.addEdge(_b1, links.list.thought_description, _b2);


          idea.update({ value: number.value(10), unit: idea.id });
          idea2.update({ value: number.value(10), unit: idea.id });
          expect(a.distance(b)).to.equal(0);
        });

        it.skip('i have no idea ??? ? ? ', function() {
          //idea.update({ value: number.value(10), unit: idea.id });
          //idea2.update({ value: number.value(10), unit: idea.id });
          //
          //a.state.vertices[_aidea].data.value = number.value(15);
          //b.state.vertices[_bidea].data.value = number.value(15);
          //expect(a.distance(b)).to.equal(5);
        });

        it.skip('b is inconcrete');

        // c --matchRef--> b --similar--> a
        it('to a similar', function() {
          // the data
          var DATA = discrete.cast({ value: true, unit: discrete.definitions.list.boolean });
          var idea2 = ideas.create(DATA);
          var idea3 = ideas.create(DATA);
          idea.link(links.list.thought_description, idea2);
          idea2.link(links.list.thought_description, idea3);

          // concrete base
          var _a1 = a.state.addVertex(subgraph.matcher.id, idea);
          var _a2 = a.state.addVertex(subgraph.matcher.id, idea2, {transitionable:true});
          var _a3 = a.state.addVertex(subgraph.matcher.id, idea3, {transitionable:true});
          a.state.addEdge(_a1, links.list.thought_description, _a2);
          a.state.addEdge(_a2, links.list.thought_description, _a3);
          expect(a.state.concrete).to.equal(true);

          // abstract search
          var _b1 = b.state.addVertex(subgraph.matcher.id, idea);
          var _b2 = b.state.addVertex(subgraph.matcher.similar, {unit: discrete.definitions.list.boolean}, {transitionable:true});
          var _b3 = b.state.addVertex(subgraph.matcher.discrete, _b2, {transitionable:true,matchRef:true});
          b.state.addEdge(_b1, links.list.thought_description, _b2);
          b.state.addEdge(_b2, links.list.thought_description, _b3);


          // test the match and difference
          expect(subgraph.match(a.state, b.state, true).length).to.equal(1);
          expect(a.distance(b)).to.equal(0);


          // now update the data within the outer vertex for the similar matcher
          a.state.setData(_a2, {value: false, unit: discrete.definitions.list.boolean});
          expect(subgraph.match(a.state, b.state, true).length).to.equal(1);
          expect(a.distance(b)).to.equal(1);
        });
      }); // end matchRef
    }); // end distance

    it('actions', function() {
      var idea_1 = ideas.create();

      var bs = new blueprint.State(new subgraph.Subgraph(), []);
      var a = new actuator.Action();
      var a_i1 = a.requirements.addVertex(subgraph.matcher.id, idea_1, {transitionable:true});
      a.transitions.push({vertex_id: a_i1, replace: { thing: 42 }});

      // no actions and no state
      expect(bs.actions()).to.deep.equal([]);

      // what happens when you have actions but no prereqs
      // there is no match in the reqs
      bs.availableActions.push(a);
      expect(bs.actions()).to.deep.equal([]);

      // now if we have something in the state, but no actions
      bs.availableActions.splice(0);
      bs.state.addVertex(subgraph.matcher.id, idea_1, {transitionable:true});
      expect(bs.actions()).to.deep.equal([]);

      // and finally, if there is a state and action
      bs.availableActions.push(a);
      expect(bs.actions().length).to.equal(1);

      // the point of this isn't to unit test the actuator
    });

    it.skip('actions cae');

    it.skip('matches');

    // these are integration tests
    describe('save & load', function() {
      it.skip('loaded can be used in a plan');
    }); // end save & load

  }); // end State
}); // end blueprint