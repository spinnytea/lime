'use strict';
var _ = require('lodash');
var expect = require('chai').expect;
var config = require('../../../src/config');
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

    it('frontier', function() {
      var frontier = astar.units.frontier();

      frontier.enq({ cost: 1, distFromGoal: 4 });
      frontier.enq({ cost: 3, distFromGoal: 5 });
      frontier.enq({ cost: 1, distFromGoal: 5 });
      frontier.enq({ cost: 1, distFromGoal: 0 });
      frontier.enq({ cost: 12, distFromGoal: 4 });

      expect(frontier.size()).to.equal(5);
      expect(frontier.deq()).to.deep.equal({ cost: 1, distFromGoal: 0 });
      expect(frontier.size()).to.equal(4);
      expect(frontier.deq()).to.deep.equal({ cost: 1, distFromGoal: 4 });
      expect(frontier.size()).to.equal(3);
      expect(frontier.deq()).to.deep.equal({ cost: 1, distFromGoal: 5 });
      expect(frontier.size()).to.equal(2);
      expect(frontier.deq()).to.deep.equal({ cost: 12, distFromGoal: 4 });
      expect(frontier.size()).to.equal(1);
      expect(frontier.deq()).to.deep.equal({ cost: 3, distFromGoal: 5 });
      expect(frontier.size()).to.equal(0);
      expect(frontier.isEmpty()).to.equal(true);
    });

    it('step', function() {
      function summary(frontier) {
        // pull out all the elements in the frontier so we can have a good sorted order
        var list = [];
        while(!frontier.isEmpty()) {
          list.push(frontier.deq());
        }
        list.forEach(function(p) {
          frontier.enq(p);
        });

        return list.map(function(path) {
          return {
            cost: path.cost,
            dist: path.distFromGoal,
            actions: _.pluck(path.actions, 'dir')
          };
        });
      }

      var goal = new NumberSlide.State([[1, 2], [3, 0]]);
      var start = new NumberSlide.State([[2, 0], [1, 3]]);
      var frontier = astar.units.frontier();
      var path;

      path = new Path.Path([start], [], [], goal);
      astar.units.step(path, frontier);
      expect(frontier._elements.length).to.equal(2);
      expect(summary(frontier)).to.deep.equal([
        { cost: 1, dist: 4, actions: [ 'down' ] },
        { cost: 1, dist: 4, actions: [ 'left' ] }
      ]);

      path = frontier.deq();
      astar.units.step(path, frontier);
      expect(frontier._elements.length).to.equal(3);
      expect(summary(frontier)).to.deep.equal([
        { cost: 1, dist: 4, actions: [ 'left' ] },
        { cost: 2, dist: 4, actions: [ 'down', 'up' ] },
        { cost: 2, dist: 6, actions: [ 'down', 'left' ] }
      ]);

      path = frontier.deq();
      astar.units.step(path, frontier);
      expect(frontier._elements.length).to.equal(4);
      expect(summary(frontier)).to.deep.equal([
        { cost: 2, dist: 2, actions: [ 'left', 'down' ] },
        { cost: 2, dist: 4, actions: [ 'down', 'up' ] },
        { cost: 2, dist: 4, actions: [ 'left', 'right' ] },
        { cost: 2, dist: 6, actions: [ 'down', 'left' ] }
      ]);

      path = frontier.deq();
      astar.units.step(path, frontier);
      expect(frontier._elements.length).to.equal(5);
      expect(summary(frontier)).to.deep.equal([
        { cost: 3, dist: 0, actions: [ 'left', 'down', 'right' ] },
        { cost: 2, dist: 4, actions: [ 'left', 'right' ] },
        { cost: 2, dist: 4, actions: [ 'down', 'up' ] },
        { cost: 3, dist: 4, actions: [ 'left', 'down', 'up' ] },
        { cost: 2, dist: 6, actions: [ 'down', 'left' ] }
      ]);

      path = frontier.deq();

      expect(path.distFromGoal).to.equal(0); // this was verfied in the summary
      expect(path.last.matches(goal)).to.equal(true);

      //
      // what if we take another step after reaching the goal?
      //
      //astar.units.step(path, frontier);
      //expect(frontier._elements.length).to.equal(6);
      //expect(summary(frontier)).to.deep.equal([
      //  { cost: 4, dist: 2, actions: [ 'left', 'down', 'right', 'up' ] },
      //  { cost: 4, dist: 2, actions: [ 'left', 'down', 'right', 'left' ] },
      //  { cost: 2, dist: 4, actions: [ 'down', 'up' ] },
      //  { cost: 2, dist: 4, actions: [ 'left', 'right' ] },
      //  { cost: 3, dist: 4, actions: [ 'left', 'down', 'up' ] },
      //  { cost: 2, dist: 6, actions: [ 'down', 'left' ] }
      //]);
    });
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