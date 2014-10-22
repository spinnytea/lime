'use strict';
/* global describe, it, beforeEach, afterEach */
var _ = require('lodash');
var expect = require('chai').expect;
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
      var idea = tools.ideas.create();

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

    it('id: basic search', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create();
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.id, apple.id);
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.vertices[m].idea.id).to.equal(mark.id);
      expect(sg.vertices[a].idea.id).to.equal(apple.id);
    });

    it('filler: function', function() {
      expect(subgraph.matcher.filler()).to.equal(true);
      expect(subgraph.matcher.filler(undefined, '')).to.equal(true);
      expect(subgraph.matcher.filler('', 134)).to.equal(true);
    });

    it('filler: basic search', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create();
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

      it('exact: basic search', function() {
        var mark = tools.ideas.create();
        var apple = tools.ideas.create({'thing': 3.14});
        mark.link(links.list.thought_description, apple);

        var sg = new subgraph.Subgraph();
        var m = sg.addVertex(subgraph.matcher.id, mark.id);
        var a = sg.addVertex(subgraph.matcher.data.exact, {'thing': 3.14});
        sg.addEdge(m, links.list.thought_description, a);

        var result = subgraph.search(sg);
        expect(result.length).to.equal(1);
        expect(sg).to.equal(result[0]);

        expect(sg.vertices[m].idea.id).to.equal(mark.id);
        expect(sg.vertices[a].idea.id).to.equal(apple.id);

        // fail
        sg = new subgraph.Subgraph();
        m = sg.addVertex(subgraph.matcher.id, mark.id);
        a = sg.addVertex(subgraph.matcher.data.exact, {'thing': 2.71});
        sg.addEdge(m, links.list.thought_description, a);

        result = subgraph.search(sg);
        expect(result.length).to.equal(0);
      });

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

      it('similar: basic search', function() {
        var mark = tools.ideas.create();
        var apple = tools.ideas.create({'thing1': 3.14, 'thing2': 2.71});
        mark.link(links.list.thought_description, apple);

        var sg = new subgraph.Subgraph();
        var m = sg.addVertex(subgraph.matcher.id, mark.id);
        var a = sg.addVertex(subgraph.matcher.data.similar, {'thing1': 3.14});
        sg.addEdge(m, links.list.thought_description, a);

        var result = subgraph.search(sg);
        expect(result.length).to.equal(1);

        // fail
        sg = new subgraph.Subgraph();
        m = sg.addVertex(subgraph.matcher.id, mark.id);
        a = sg.addVertex(subgraph.matcher.data.similar, {'asdfasdfasdf': 1234});
        sg.addEdge(m, links.list.thought_description, a);

        result = subgraph.search(sg);
        expect(result.length).to.equal(0);
      });
    }); // end data
  }); // end matchers

  describe('search', function() {
    it('nothing to do', function() {
      // invalid subgraph
      expect(subgraph.search()).to.deep.equal([]);

      var sg = new subgraph.Subgraph();
      expect(subgraph.search(sg)).to.deep.equal([sg]);
    });

    it('no id matchers', function() {
        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.filler);
        var b = sg.addVertex(subgraph.matcher.filler);
        sg.addEdge(a, links.list.thought_description, b);

        expect(subgraph.search(sg)).to.deep.equal([]);
    });

    describe('clauses', function() {
      describe('selectedEdge', function() {
        var mark, apple;
        var sg, m, a;
        beforeEach(function() {
          mark = tools.ideas.create();
          apple = tools.ideas.create();
          mark.link(links.list.thought_description, apple);
        });

        afterEach(function() {
          expect(subgraph.search(sg)).to.deep.equal([sg]);
          expect(sg.concrete).to.equal(true);
          expect(sg.vertices[m].idea).to.deep.equal(mark);
          expect(sg.vertices[a].idea).to.deep.equal(apple);
        });

        it('isSrc && !isDst', function() {
          sg = new subgraph.Subgraph();
          m = sg.addVertex(subgraph.matcher.id, mark);
          a = sg.addVertex(subgraph.matcher.filler);
          sg.addEdge(m, links.list.thought_description, a);
        });

        it('!isSrc && isDst', function() {
          sg = new subgraph.Subgraph();
          m = sg.addVertex(subgraph.matcher.filler);
          a = sg.addVertex(subgraph.matcher.id, apple);
          sg.addEdge(m, links.list.thought_description, a);
        });

        it('isSrc && isDst', function() {
          sg = new subgraph.Subgraph();
          m = sg.addVertex(subgraph.matcher.id, mark);
          a = sg.addVertex(subgraph.matcher.id, apple);
          sg.addEdge(m, links.list.thought_description, a);
        });
      }); // end selectedEdge

      describe('expand branches', function() {
        it('0', function() {
          var mark = tools.ideas.create();

          var sg = new subgraph.Subgraph();
          var m = sg.addVertex(subgraph.matcher.id, mark);
          var a = sg.addVertex(subgraph.matcher.filler);
          sg.addEdge(m, links.list.thought_description, a);

          expect(subgraph.search(sg)).to.deep.equal([]);
        });

        it('1', function() {
          var mark = tools.ideas.create();
          var apple = tools.ideas.create();
          mark.link(links.list.thought_description, apple);

          var sg = new subgraph.Subgraph();
          var m = sg.addVertex(subgraph.matcher.id, mark);
          var a = sg.addVertex(subgraph.matcher.filler);
          sg.addEdge(m, links.list.thought_description, a);

          expect(subgraph.search(sg)).to.deep.equal([sg]);
        });

        it('many', function() {
          var mark = tools.ideas.create();
          var apple = tools.ideas.create();
          var banana = tools.ideas.create();
          mark.link(links.list.thought_description, apple);
          mark.link(links.list.thought_description, banana);

          var sg = new subgraph.Subgraph();
          var m = sg.addVertex(subgraph.matcher.id, mark);
          var a = sg.addVertex(subgraph.matcher.filler);
          sg.addEdge(m, links.list.thought_description, a);

          var results = subgraph.search(sg);
          expect(results.length).to.equal(2);

          var one = results[0];
          expect(one).to.not.equal(sg);
          expect(one.vertices[m].idea).to.deep.equal(mark);
          expect(one.vertices[a].idea).to.deep.equal(apple);

          var two = results[1];
          expect(two).to.not.equal(sg);
          expect(two.vertices[m].idea).to.deep.equal(mark);
          expect(two.vertices[a].idea).to.deep.equal(banana);
        });
      }); // end expand branches

      describe('nextSteps', function() {
        // general case for no IDs, or no edges to expand
//        it.skip('none: fail');

        // general case for end of recursion, all edges have been expanded, === concrete
//        it.skip('none: success');

        // general recursive case
        it('some', function() {
          var mark = tools.ideas.create();
          var apple = tools.ideas.create();
          var price = tools.ideas.create({value: 10});
          mark.link(links.list.thought_description, apple);
          apple.link(links.list.thought_description, price);

          var sg = new subgraph.Subgraph();
          var m = sg.addVertex(subgraph.matcher.id, mark);
          var a = sg.addVertex(subgraph.matcher.filler);
          var p = sg.addVertex(subgraph.matcher.data.similar, {value: 10});
          sg.addEdge(m, links.list.thought_description, a);
          sg.addEdge(a, links.list.thought_description, p);

          expect(subgraph.search(sg)).to.deep.equal([sg]);
          expect(sg.vertices[m].idea).to.deep.equal(mark);
          expect(sg.vertices[a].idea).to.deep.equal(apple);
          expect(sg.vertices[p].idea).to.deep.equal(price);
        });
      }); // end nextSteps

    }); // end clauses
  }); // end search
}); // end subgraph