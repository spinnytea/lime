'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var config = require('../../../config');
var astar = require('../../../src/planning/algorithms/astar');
var path = require('../../../src/planning/primitives/path');
var NumberSlide = require('../NumberSlide');


describe('astar', function() {
  it('init', function() {
    expect(config.settings.astar_max_paths).to.be.a('number');

    expect(Object.keys(astar)).to.deep.equal(['units', 'search']);
    expect(Object.keys(path)).to.deep.equal(['Path', 'Action', 'State']);

    expect(NumberSlide.Action).to.be.a('function');
    expect(NumberSlide.State).to.be.a('function');
    expect(_.intersection(Object.keys(NumberSlide.Action.prototype), Object.keys(path.Action.prototype))).to.deep.equal(Object.keys(path.Action.prototype));
    expect(_.intersection(Object.keys(NumberSlide.State.prototype), Object.keys(path.State.prototype))).to.deep.equal(Object.keys(path.State.prototype));
  });

  describe('units', function() {
    it.skip('frontier');

    // I'm not sure how to test this, really
    // It probably works from the fact that we can solve the astar problems
    // Testing this would be testing the library (but I do need to make sure that I can use it)
    //it.skip('frontier order');

    it.skip('step');
    it.skip('step when at goal');
  }); // end unit

  describe('search', function() {
    it('first!', function() {
      var goal = new NumberSlide.State([[1, 2], [3, 0]]);
      var start = new NumberSlide.State([[1, 2], [0, 3]]);
      var right = start.actions()[1];

      var path = astar.search(start, goal);

      expect(path).to.be.ok;
      expect(path.states).to.deep.equal([start, goal]);
      expect(path.actions).to.deep.equal([right]);
    });

    it('no change', function() {
      var goal = new NumberSlide.State([[1, 2], [3, 0]]);
      var path = astar.search(goal, goal);

      expect(path).to.be.ok;
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

      expect(path).to.be.ok;
      expect(path.states[0].numbers).to.deep.equal(start.numbers);
      expect(_.last(path.states).numbers).to.deep.equal(goal.numbers);
      expect(_.pluck(path.actions, 'dir')).to.deep.equal([
        'down', 'left', 'up', 'left', 'down', 'down', 'right', 'right'
      ]);
    });

    it('frontier too large', function() {
      var before = config.settings.astar_max_paths;
      expect(before).to.be.gt(10);
      var goal =  new NumberSlide.State([[1, 2, 3, 4, 0]]);
      var start =  new NumberSlide.State([[0, 1, 2, 3, 4]]);

      var path = astar.search(start, goal);
      expect(path).to.be.ok;
      expect(_.pluck(path.actions, 'dir')).to.deep.equal([ 'right', 'right', 'right', 'right' ]);

      config.settings.astar_max_paths = 2;
      path = astar.search(start, goal);
      expect(path).to.not.be.ok;

      // reset the config from before the test
      config.settings.astar_max_paths = before;
    });

    it('no solution', function() {
      var goal =  new NumberSlide.State([[1, 2, 3, 4, 0]]);
      var start =  new NumberSlide.State([[0, 1, 4, 2, 3]]);
      var path = astar.search(start, goal);

      expect(path).to.not.be.ok;
    });
  }); // end search
}); // end astar