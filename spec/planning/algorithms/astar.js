'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var config = require('../../../config');
var astar = require('../../../src/planning/algorithms/astar');
var Path = require('../../../src/planning/primitives/path');
var NumberSlide = require('../NumberSlide');


describe('astar', function() {
  it('init', function() {
    expect(config.settings.astar_max_paths).to.be.a('number');

    expect(Object.keys(astar)).to.deep.equal(['search']);
    expect(Object.keys(Path)).to.deep.equal(['Path', 'Action', 'State']);

    expect(NumberSlide.Action).to.be.a('function');
    expect(NumberSlide.State).to.be.a('function');
    expect(_.intersection(Object.keys(NumberSlide.Action.prototype), Object.keys(Path.Action.prototype))).to.deep.equal(Object.keys(Path.Action.prototype));
    expect(_.intersection(Object.keys(NumberSlide.State.prototype), Object.keys(Path.State.prototype))).to.deep.equal(Object.keys(Path.State.prototype));
  });

  describe('units', function() {
    it('init', function() {
      expect(Object.keys(astar.units)).to.deep.equal(['frontier', 'step']);
    });

    it.skip('frontier');

    // this is basically testing that our sort function works
    // which is a pretty big deal
    // look to lm-wumpus for examples
    it.skip('frontier order');

    it.skip('step');
    it.skip('step when at goal');
  }); // end unit

  describe('search', function() {
    it('first!', function() {
      var goal = new NumberSlide.State([[1, 2], [3, 0]]);
      var start = new NumberSlide.State([[1, 2], [0, 3]]);
      var right = start.actions()[1].action;

      var path = astar.search(start, goal);

      expect(path).to.be.an.instanceOf(Path.Path);
      expect(path.states).to.deep.equal([start, goal]);
      expect(path.actions).to.deep.equal([right]);
    });

    it('no change', function() {
      var goal = new NumberSlide.State([[1, 2], [3, 0]]);
      var path = astar.search(goal, goal);

      expect(path).to.be.an.instanceOf(Path.Path);
      expect(path.states).to.deep.equal([goal]);
      expect(path.actions).to.deep.equal([]);
    });

    it('second!', function() {
      var goal =  new NumberSlide.State([[1, 2, 3],
                                         [4, 5, 6],
                                         [7, 8, 0]]);
      var start = new NumberSlide.State([[2, 5, 0],
                                         [1, 6, 3],
                                         [4, 7, 8]]);
      var path = astar.search(start, goal);

      expect(path).to.be.an.instanceOf(Path.Path);
      expect(path.states[0].numbers).to.deep.equal(start.numbers);
      expect(_.last(path.states).numbers).to.deep.equal(goal.numbers);
      expect(_.pluck(path.actions, 'dir')).to.deep.equal([
        'down', 'left', 'up', 'left', 'down', 'down', 'right', 'right'
      ]);
    });

    it('[goal]', function() {
      // this search is setup backwards
      // other tests want to have multiple starting points to converge on one goal
      // this one wants to see how one starting point fairs against multiple destinations

      var goalA = new NumberSlide.State([[0, 2], [1, 3]]);
      var goalB = new NumberSlide.State([[3, 1], [0, 2]]);

      var start = new NumberSlide.State([[1, 2], [3, 0]]);

      // prove path A
      var path = astar.search(start, [goalA]);
      expect(_.pluck(path.actions, 'dir')).to.deep.equal(['left', 'up']);
      expect(path.goal).to.equal(goalA);
      //  prove path B
      path = astar.search(start, [goalB]);
      expect(_.pluck(path.actions, 'dir')).to.deep.equal(['up', 'left', 'down']);
      expect(path.goal).to.equal(goalB);

      // now prove that it picks the shortest one
      path = astar.search(start, [goalA, goalB]);
      expect(_.pluck(path.actions, 'dir')).to.deep.equal(['left', 'up']);
      expect(path.goal).to.equal(goalA);
    });

    it.skip('stub solveAt IMMEDIATE', function() {
      // for now, this was tested using lm-wumpus
      // but we really need one here in this source
    });

    it.skip('stub solveAt IMMEDIATE with subactions');

    it.skip('serial plan with only a serial plan', function() {
      // lm-wumpus astar small step-through has a [['right', 'up']]
      // we should probably unwrap that
      // ['left', ['right', 'up']] is okay
    });

    it('frontier too large', function() {
      var before = config.settings.astar_max_paths;
      expect(before).to.be.gt(10);
      var goal =  new NumberSlide.State([[1, 2, 3, 4, 0]]);
      var start =  new NumberSlide.State([[0, 1, 2, 3, 4]]);

      var path = astar.search(start, goal);
      expect(path).to.be.an.instanceOf(Path.Path);
      expect(_.pluck(path.actions, 'dir')).to.deep.equal([ 'right', 'right', 'right', 'right' ]);

      config.settings.astar_max_paths = 2;
      path = astar.search(start, goal);
      expect(path).to.equal(undefined);

      // reset the config from before the test
      config.settings.astar_max_paths = before;
    });

    it('no solution', function() {
      var goal =  new NumberSlide.State([[1, 2, 3, 4, 0]]);
      var start =  new NumberSlide.State([[0, 1, 4, 2, 3]]);
      var path = astar.search(start, goal);

      expect(path).to.equal(undefined);
    });
  }); // end search
}); // end astar