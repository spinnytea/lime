'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var config = require('../../../../config');
var astar = require('../../../../src/core/planning/algorithms/astar');
var path = require('../../../../src/core/planning/primitives/path');
var NumberSlide = require('../NumberSlide');


describe('astar', function() {
  it('init', function() {
    expect(astar).to.have.property('search');
    expect(config.data.astar_max_paths).to.be.a('number');
    expect(path).to.have.property('Path');

    expect(NumberSlide.Action).to.be.a('function');
    expect(NumberSlide.State).to.be.a('function');
    expect(_.intersection(Object.keys(NumberSlide.Action.prototype), Object.keys(path.Action.prototype))).to.deep.equal(Object.keys(path.Action.prototype));
    expect(_.intersection(Object.keys(NumberSlide.State.prototype), Object.keys(path.State.prototype))).to.deep.equal(Object.keys(path.State.prototype));
  });

    // I'm not sure how to test this, really
    // It probably works from the fact that we can solve the astar problems
    // Testing this would be testing the library (but I do need to make sure that I can use it)
    // ~ this has been moved to javascript.js
//  it.skip('frontier order');

  describe('search', function() {
    it('first!', function() {
      var goal = new NumberSlide.State([[1, 2], [3, 0]]);
      var start = new NumberSlide.State([[1, 2], [0, 3]]);
      var right = start.actions()[1];

      var path = astar.search(start, goal);

      expect(path).to.not.be.undefined;
      expect(path.states).to.deep.equal([start, goal]);
      expect(path.actions).to.deep.equal([right]);
    });

    it('no change', function() {
      var goal = new NumberSlide.State([[1, 2], [3, 0]]);
      var path = astar.search(goal, goal);

      expect(path.states).to.deep.equal([goal]);
      expect(path.actions).to.deep.equal([]);
    });

    it('second!', function() {
      var goal =  new NumberSlide.State([[1, 2, 3],
                                         [4, 5, 6],
                                         [7, 8, 0]]);
      var start = new NumberSlide.State([[2, 6, 5],
                                         [1, 7, 3],
                                         [0, 4, 8]]);
      var path = astar.search(start, goal);

      expect(path.states[0].numbers).to.deep.equal(start.numbers);
      expect(_.last(path.states).numbers).to.deep.equal(goal.numbers);
      expect(_.pluck(path.actions, 'dir')).to.deep.equal(['right', 'up', 'up', 'right',
        'down', 'left', 'up', 'left', 'down', 'down', 'right', 'right']);
    });

    it.skip('frontier too large');

    it.skip('no solution');
  }); // end search
}); // end astar