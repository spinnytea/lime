'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var astar = require('../../../src/planning/algorithms/astar');
var Path = require('../../../src/planning/primitives/path');
var NumberSlide = require('../NumberSlide');

describe('path',  function() {
  var fourG = new NumberSlide.State([[1, 2], [3, 0]]);
  var fourA = new NumberSlide.State([[1, 2], [3, 0]]);
  var fourB = new NumberSlide.State([[1, 2], [0, 3]]);
  var fourC = new NumberSlide.State([[2, 0], [3, 1]]);

  var sixG = new NumberSlide.State([[1, 2], [3, 4], [5, 0]]);
  var sixA = new NumberSlide.State([[1, 2], [3, 4], [5, 0]]);
  var sixB = new NumberSlide.State([[2, 3],
                                    [0, 1],
                                    [5, 4]]);

  it('init', function() {
    expect(Path).to.have.property('Path');
    expect(Path).to.have.property('Action');
    expect(Path).to.have.property('State');

    // TODO should this be a standard test in path?
    // (it is here as an example)
    var state = new Path.State();
    var nsState = new NumberSlide.State();
    _.forIn(state, function(ignore, key) {
      expect(nsState).to.have.property(key);
    });
  });

  describe('NumberSlideAction', function() {
    // it.skip('cost');

    it('apply', function() {
      var before = _.cloneDeep(fourB.numbers);
      var action = fourB.actions()[1].action;
      expect(action.dir).to.equal('right');

      // solve the puzzle
      expect(action.apply(fourB).numbers).to.deep.equal(fourG.numbers);

      // apply shouldn't change the original
      expect(fourB.numbers).to.deep.equal(before);
      expect(action.apply(fourB).numbers).to.deep.equal(fourG.numbers);
    });
  }); // end NumberSlideAction

  describe('NumberSlideState', function() {
    it('find', function() {
      fourG.find(1, function(y, x) {
        expect(y).to.equal(0);
        expect(x).to.equal(0);
      });
      fourG.find(2, function(y, x) {
        expect(y).to.equal(0);
        expect(x).to.equal(1);
      });
      fourG.find(3, function(y, x) {
        expect(y).to.equal(1);
        expect(x).to.equal(0);
      });
      fourG.find(4, function(y, x) {
        expect(y).to.equal(1);
        expect(x).to.equal(1);
      });
      sixG.find(6, function(y, x) {
        expect(y).to.equal(2);
        expect(x).to.equal(1);
      });
    });

    it('distance', function() {
      expect(fourG.distance(fourG)).to.equal(0);
      expect(fourA.distance(fourG)).to.equal(0);
      expect(fourG.distance(fourA)).to.equal(0);
      // two neighboring numbers are swapped
      expect(fourB.distance(fourG)).to.equal(2);
      expect(fourG.distance(fourB)).to.equal(2);
      // distances: {1: 2, 2: 1, 3: 0, 4: 1}
      expect(fourC.distance(fourG)).to.equal(4);
      expect(fourG.distance(fourC)).to.equal(4);

      expect(sixG.distance(sixG)).to.equal(0);
      expect(sixA.distance(sixG)).to.equal(0);
      expect(sixB.distance(sixG)).to.equal(8);
    });
    // no need to test/create a distance of infinity for invalid states
    // this is just for testing; it doesn't need to be perfectly resilient
//    it.skip('distance: Infinity');

    it('actions', function() {
      expect(fourA._actions).to.equal(null);

      expect(fourA.actions().length).to.equal(2);
      expect(sixB.actions().length).to.equal(3);

      expect(fourA.actions().map(function(a) { return a.action.dir; })).to.deep.equal(['up', 'left']);
      expect(sixB.actions().map(function(a) { return a.action.dir; })).to.deep.equal(['up', 'down', 'right']);
    });

    it('matches', function() {
      expect(fourG.matches(fourG)).to.equal(true);
      expect(fourA.matches(fourG)).to.equal(true);
      expect(fourB.matches(fourG)).to.equal(false);
      expect(fourC.matches(fourG)).to.equal(false);

      expect(sixG.matches(sixG)).to.equal(true);
      expect(sixA.matches(sixG)).to.equal(true);
      expect(sixB.matches(sixG)).to.equal(false);
    });
  }); // end NumberSlideState

  describe('Path', function() {
    it('constructor', function() {
      var action = fourB.actions()[1].action;
      var path = new Path.Path([fourB, fourG], [action], [undefined], fourG);

      expect(path.states).to.deep.equal([fourB, fourG]);
      expect(path.actions).to.deep.equal([action]);
      expect(path.goal).to.equal(fourG);
      expect(path.cost).to.equal(1);
      expect(path.last).to.equal(fourG);
      expect(path.distFromGoal).to.equal(0);
    });

    it('cost / distanceFromGoal', function() {
      var goal =  new NumberSlide.State([[1, 2, 3],
                                         [4, 5, 6],
                                         [7, 8, 0]]);
      var start = new NumberSlide.State([[2, 5, 0],
                                         [1, 6, 3],
                                         [4, 7, 8]]);
      var path = astar.search(start, goal);

      // there are twelve steps to solve this plan
      expect(path.actions.length).to.equal(8);
      // each number slide action costs 1
      expect(path.cost).to.equal(8);
      expect(path.distFromGoal).to.equal(0);

      path = new Path.Path([start], [], [], goal);
      expect(path.cost).to.equal(0); // we didn't do anything yet
      expect(path.distFromGoal).to.equal(10);
      expect(start.distance(goal)).to.equal(10); // how many things are out of place and by how far

    }); // we need an action that has a complex cost to test this properly

    it('add', function() {
      // prep
      var states = [fourB, fourG];
      var right = fourB.actions()[1].action;
      var left = fourG.actions()[1].action;
      var path = new Path.Path(states, [right], [undefined], fourG);

      // action
      var next = path.add(fourB, left, undefined);

      // tests
      expect(next).to.not.equal(path);
      expect(next.states).to.deep.equal([fourB, fourG, fourB]);
      expect(next.actions).to.deep.equal([right, left]);
      expect(next.goal).to.equal(fourG);
      expect(next.cost).to.equal(2);
      expect(next.last).to.equal(fourB);
      expect(next.distFromGoal).to.equal(2);
    });
  }); // end Path
}); // end path