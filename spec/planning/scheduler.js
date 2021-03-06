'use strict';
var expect = require('chai').expect;

var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var scheduler = require('../../src/planning/scheduler');
var subgraph = require('../../src/database/subgraph');

describe('scheduler', function() {
  require('../database/ideas').mock();

  describe('defer', function() {
    var context, goal, result;

    beforeEach(function() {
      var idea = ideas.create();
      idea.link(links.list.thought_description, ideas.create());

      context = new subgraph.Subgraph();
      context.addEdge(
        context.addVertex(subgraph.matcher.id, idea.id),
        links.list.thought_description,
        context.addVertex(subgraph.matcher.filler)
      );

      expect(subgraph.search(context)).to.deep.equal([context]);
      expect(context.concrete).to.equal(true);

      goal = new subgraph.Subgraph();
      goal.addEdge(
        goal.addVertex(subgraph.matcher.id, idea.id),
        links.list.thought_description,
        goal.addVertex(subgraph.matcher.exact, {value: 2})
      );

      // kick off the scheduler
      // passing or failing just records the result
      scheduler.defer(context, goal).then(function() {
        result = true;
      }, function() {
        result = false;
      });
    });

    it.skip('quick check', function() {
      // is there a specific vertex we can check for an updated value?
      // this will make the dirty checking go faster
      // we will check the WHOLE graph only once this condition is met
      // ...
      // or will the goals be small enough that this doesn't matter
      //
      // if we save the vertexMap list up front, then these will be the transitions
    });

    it('resolve', function(done) {
      context.setData(1, {value: 2});

      scheduler.check().then(function() {
        expect(result).to.equal(true);
      }).finally(done).catch(done);
    });

    it('reject', function(done) {
      context.setData(1, {value: 10});

      scheduler.check().then(function() {
        expect(result).to.equal(false);
      }).finally(done).catch(done);
    });
  }); // end defer
}); // end scheduler