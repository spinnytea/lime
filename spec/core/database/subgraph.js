'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var ideas = require('../../../src/core/database/ideas');
var links = require('../../../src/core/database/links');
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe('subgraph', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(subgraph)).to.deep.equal(['Subgraph', 'matcher', 'search']);
    expect(Object.keys(subgraph.Subgraph.prototype)).to.deep.equal(['copy', 'addVertex', 'addEdge']);
    expect(Object.keys(subgraph.matcher)).to.deep.equal(['id', 'filler', 'data']);
    expect(Object.keys(subgraph.matcher.data)).to.deep.equal(['exact', 'similar']);
  });

  describe('Subgraph', function() {
    it('addVertex', function() {
      var idea = ideas.create();

      var sg = new subgraph.Subgraph();
      var a = sg.addVertex(subgraph.matcher.id, idea.id);

      expect(_.size(sg.vertices)).to.equal(1);
      expect(sg.vertices[a]).to.be.ok;
      expect(sg.vertices[a].vertex_id).to.equal(a);
      expect(sg.vertices[a].matches).to.equal(subgraph.matcher.id);

      var b = sg.addVertex(subgraph.matcher.id, idea);
      expect(a).to.not.equal(b);
      expect(_.size(sg.vertices)).to.equal(2);
    });

    it('addEdge', function() {
      var sg = new subgraph.Subgraph();
      var a = sg.addVertex(subgraph.matcher.filler);
      var b = sg.addVertex(subgraph.matcher.filler);

      sg.addEdge(a, links.list.thought_description, b);

      expect(sg.edges.length).to.equal(1);
      var edge = sg.edges[0];
      expect(edge.src).to.be.an('object');
      expect(edge.src.vertex_id).to.equal(a);
      expect(edge.link.name).to.equal(links.list.thought_description.name);
      expect(edge.dst.vertex_id).to.equal(b);
    });

    it('copy', function() {
      // empty
      var sg = new subgraph.Subgraph();
      expect(sg.copy()).to.deep.equal(sg);

      var a = sg.addVertex(subgraph.matcher.filler);
      expect(sg.copy()).to.deep.equal(sg);

      var b = sg.addVertex(subgraph.matcher.filler);
      expect(sg.copy()).to.deep.equal(sg);

      sg.addEdge(a, links.list.thought_description, b);
      expect(sg.copy()).to.deep.equal(sg);
    });
  }); // end Subgraph

  describe('matchers', function() {
    it('id: function', function() {
      var idea = tools.ideas.create();

      expect(subgraph.matcher.id(idea, idea.id)).to.equal(true);
      expect(subgraph.matcher.id(idea, '')).to.equal(false);
    });

    it.skip('id: basic search');

    it('filler: function', function() {
      expect(subgraph.matcher.filler()).to.equal(true);
      expect(subgraph.matcher.filler(undefined, '')).to.equal(true);
      expect(subgraph.matcher.filler('', 134)).to.equal(true);
    });

    it('filler: basic search', function() {
      var mark = ideas.create();
      var apple = ideas.create();
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.vertices[m].idea.id).to.equal(mark.id);
      expect(sg.vertices[a].idea.id).to.equal(apple.id);
    });

    describe('data', function() {
      it('exact: function', function() {
        var idea = tools.ideas.create({'thing': 3.14});

        expect(subgraph.matcher.data.exact(idea, {'thing': 3.14})).to.equal(true);
        expect(subgraph.matcher.data.exact(idea, {'thing': 6.28})).to.equal(false);
        expect(subgraph.matcher.data.exact(idea, {})).to.equal(false);
      });

      it.skip('exact: basic search');

      it('similar: function', function() {
        var idea = tools.ideas.create({'thing1': 3.14, 'thing2': 2.71});

        expect(subgraph.matcher.data.similar(idea, {'thing1': 3.14})).to.equal(true);
        expect(subgraph.matcher.data.similar(idea, {'thing2': 2.71})).to.equal(true);
        expect(subgraph.matcher.data.similar(idea, {})).to.equal(true);
        expect(subgraph.matcher.data.similar(idea)).to.equal(true);
        expect(subgraph.matcher.data.similar(idea, {'thing2': 42})).to.equal(false);
        expect(subgraph.matcher.data.similar(idea, {'others': 42})).to.equal(false);

        // the data shouldn't have been changed after any of this
        expect(idea.data()).to.deep.equal({'thing1': 3.14, 'thing2': 2.71});
      });

      it.skip('similar: basic search');
    }); // end data
  }); // end matchers

  describe('search', function() {
    it('nothing to do', function() {
      // invalid subgraph
      expect(subgraph.search()).to.deep.equal([]);

      var sg = new subgraph.Subgraph();
      expect(subgraph.search(sg)).to.deep.equal([]);
    });

    it.skip('no id matchers');

    describe('clauses', function() {
      describe('selectedEdge', function() {
        it.skip('isSrc && !isDst');

        it.skip('!isSrc && isDst');

        it.skip('isSrc && isDst');
      }); // end selectedEdge

      describe('expand branches', function() {
        it.skip('0');

        it.skip('1');

        it.skip('many');
      }); // end expand branches

      describe('nextSteps', function() {
        it.skip('none: fail');

        it.skip('none: success');

        it.skip('some');
      });
    }); // end clauses
  }); // end search
}); // end subgraph