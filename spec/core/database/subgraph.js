'use strict';
/* global describe, it, beforeEach, afterEach */
var _ = require('lodash');
var expect = require('chai').expect;
var discrete = require('../../../src/core/planning/primitives/discrete');
var links = require('../../../src/core/database/links');
var number = require('../../../src/core/planning/primitives/number');
var subgraph = require('../../../src/core/database/subgraph');
var tools = require('../testingTools');

describe('subgraph', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(subgraph)).to.deep.equal(['Subgraph', 'matcher', 'stringify', 'parse', 'search', 'match', 'rewrite']);
    expect(Object.keys(subgraph.Subgraph.prototype)).to.deep.equal(['copy', 'addVertex', 'addEdge']);
    expect(Object.keys(subgraph.matcher)).to.deep.equal(['id', 'filler', 'exact', 'similar', 'number']);
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
      expect(edge.pref).to.equal(0);

      sg.addEdge(a, links.list.thought_description, b, 100);
      expect(sg.edges.length).to.equal(2);
      expect(sg.edges[1].pref).to.equal(100);
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

    describe('loadVertexData', function() {
      it('with data', function() {
        var data = { somat: 42 };
        var idea = tools.ideas.create(data);
        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, idea.id);
        expect(sg.concrete).to.equal(true);
        var v = sg.vertices[a];

        // before we load data
        expect(v._data).to.equal(undefined);

        // the data is loaded
        expect(v.data).to.deep.equal(data);

        // after we load data
        expect(v._data).to.deep.equal(data);
      });

      it('without data', function() {
        var idea = tools.ideas.create();
        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, idea.id);
        expect(sg.concrete).to.equal(true);
        var v = sg.vertices[a];

        // before we load data
        expect(v._data).to.equal(undefined);

        // the data is loaded
        expect(v.data).to.equal(undefined);

        // after we load data
        expect(v._data).to.equal(null);
      });
    }); // end loadVertexData
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

    it('exact: function', function() {
      var idea = tools.ideas.create({'thing': 3.14});

      expect(subgraph.matcher.exact(idea, {'thing': 3.14})).to.equal(true);
      expect(subgraph.matcher.exact(idea, {'thing': 6.28})).to.equal(false);
      expect(subgraph.matcher.exact(idea, {})).to.equal(false);
    });

    it('exact: basic search', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create({'thing': 3.14});
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.exact, {'thing': 3.14});
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.vertices[m].idea.id).to.equal(mark.id);
      expect(sg.vertices[a].idea.id).to.equal(apple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.exact, {'thing': 2.71});
      sg.addEdge(m, links.list.thought_description, a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });

    it('similar: function', function() {
      var idea = tools.ideas.create({'thing1': 3.14, 'thing2': 2.71});

      expect(subgraph.matcher.similar(idea, {'thing1': 3.14})).to.equal(true);
      expect(subgraph.matcher.similar(idea, {'thing2': 2.71})).to.equal(true);
      expect(subgraph.matcher.similar(idea, {})).to.equal(true);
      expect(subgraph.matcher.similar(idea)).to.equal(true);
      expect(subgraph.matcher.similar(idea, {'thing2': 42})).to.equal(false);
      expect(subgraph.matcher.similar(idea, {'others': 42})).to.equal(false);

      // the data shouldn't have been changed after any of this
      expect(idea.data()).to.deep.equal({'thing1': 3.14, 'thing2': 2.71});
    });

    it('similar: basic search', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create({'thing1': 3.14, 'thing2': 2.71});
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.similar, {'thing1': 3.14});
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.similar, {'asdfasdfasdf': 1234});
      sg.addEdge(m, links.list.thought_description, a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });

    it('number: function', function() {
      var unit = tools.ideas.create();
      var idea = tools.ideas.create({ value: number.value(10), unit: unit.id });

      expect(subgraph.matcher.number(idea, { value: number.value(10), unit: unit.id })).to.equal(true);
      expect(subgraph.matcher.number(idea, { value: number.value(0, 100), unit: unit.id })).to.equal(true);

      expect(subgraph.matcher.number(idea, { value: number.value(10), unit: '_'+unit.id })).to.equal(false);
      expect(subgraph.matcher.number(idea, { value: number.value(10) })).to.equal(false);
      expect(subgraph.matcher.number(idea, { unit: unit.id })).to.equal(false);
      expect(subgraph.matcher.number(idea)).to.equal(false);
    });

    it('number: basic search', function() {
      var unit = tools.ideas.create();
      var mark = tools.ideas.create();
      var apple = tools.ideas.create({ value: number.value(2), unit: unit.id });
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: unit.id });
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.number, { value: number.value(0), unit: unit.id });
      sg.addEdge(m, links.list.thought_description, a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });
  }); // end matchers

  it('stringify & parse', function() {
    var unit = tools.ideas.create();
    var mark = tools.ideas.create();
    var apple = tools.ideas.create({ value: number.value(2), unit: unit.id });
    mark.link(links.list.thought_description, apple);
    var sg = new subgraph.Subgraph();
    var m = sg.addVertex(subgraph.matcher.id, mark.id);
    var a = sg.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: unit.id }, true);
    sg.addEdge(m, links.list.thought_description, a, 1);

    var str = subgraph.stringify(sg);
    expect(str).to.be.ok;

    var parsed = subgraph.parse(str);

    // there was some issue getting the vertices in and out
    // so let's keep this test to see if this is a problem
    expect(parsed.vertices).to.deep.equal(sg.vertices);
    // edges are complicated
    // they probably won't ever be an issue
    expect(parsed.edges).to.deep.equal(sg.edges);
    expect(parsed).to.deep.equal(sg);

    expect(sg.concrete).to.equal(false);
    expect(subgraph.search(sg)).to.deep.equal([sg]);
    expect(sg.concrete).to.equal(true);
    expect(sg.vertices[m].idea.id).to.equal(mark.id);
    expect(sg.vertices[a].idea.id).to.equal(apple.id);

    // we can copy this for other tests
    // (usually during debugging or something)
    expect(subgraph.parse(subgraph.stringify(sg))).to.deep.equal(sg);
  });

  describe('search', function() {
    it('nothing to do', function() {
      // invalid subgraph
      expect(function() { subgraph.search(); }).to.throw(TypeError);

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

    it('only id', function() {
      var mark = tools.ideas.create();
      var sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.id, mark);

      expect(subgraph.search(sg)).to.deep.equal([sg]);
      expect(sg.concrete).to.equal(true);
    });

    it('only filler', function() {
      var sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.filler);

      expect(subgraph.search(sg)).to.deep.equal([]);
      expect(sg.concrete).to.equal(false);
    });

    it('disjoint + id', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create();
      var price = tools.ideas.create({value: 10});
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark);
      var a = sg.addVertex(subgraph.matcher.filler);
      var p = sg.addVertex(subgraph.matcher.id, price);
      sg.addEdge(m, links.list.thought_description, a);

      expect(subgraph.search(sg)).to.deep.equal([sg]);
      expect(sg.concrete).to.equal(true);
      expect(sg.vertices[m].idea.id).to.deep.equal(mark.id);
      expect(sg.vertices[a].idea.id).to.deep.equal(apple.id);
      expect(sg.vertices[p].idea.id).to.deep.equal(price.id);
    });

    it('disjoint + filler', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create();
      var price = tools.ideas.create({value: 10});
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark);
      var a = sg.addVertex(subgraph.matcher.filler);
      sg.addVertex(subgraph.matcher.similar, {value: 10});
      sg.addEdge(m, links.list.thought_description, a);

      expect(subgraph.search(sg)).to.deep.equal([]);
      expect(sg.concrete).to.equal(false);
    });

    it('disjoint', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create();
      var price = tools.ideas.create({value: 10});
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);
      var banana = tools.ideas.create();
      var bprice = tools.ideas.create({value: 20});
      banana.link(links.list.thought_description, bprice);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark);
      var a = sg.addVertex(subgraph.matcher.filler);
      var p = sg.addVertex(subgraph.matcher.similar, {value: 10});
      sg.addEdge(m, links.list.thought_description, a);
      sg.addEdge(a, links.list.thought_description, p);
      var bp = sg.addVertex(subgraph.matcher.similar, {value: 20});

      // save the setup so far
      var sg2 = sg.copy();


      // add a filler search for the banana to the first graph
      var b = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(b, links.list.thought_description, bp);
      // this doesn't work
      expect(subgraph.search(sg)).to.deep.equal([]);
      expect(sg.concrete).to.equal(false);


      // add an id search for the banana to the second graph
      b = sg2.addVertex(subgraph.matcher.id, banana);
      sg2.addEdge(b, links.list.thought_description, bp);
      // this does work
      expect(subgraph.search(sg2)).to.deep.equal([sg2]);
      expect(sg2.concrete).to.equal(true);
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
          expect(sg.vertices[m].idea.id).to.deep.equal(mark.id);
          expect(sg.vertices[a].idea.id).to.deep.equal(apple.id);
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

          var result = subgraph.search(sg);
          expect(result.length).to.equal(2);

          var one = result[0];
          expect(one).to.not.equal(sg);
          expect(one.vertices[m].idea.id).to.deep.equal(mark.id);
          expect(one.vertices[a].idea.id).to.deep.equal(apple.id);

          var two = result[1];
          expect(two).to.not.equal(sg);
          expect(two.vertices[m].idea.id).to.deep.equal(mark.id);
          expect(two.vertices[a].idea.id).to.deep.equal(banana.id);
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
          var p = sg.addVertex(subgraph.matcher.similar, {value: 10});
          sg.addEdge(m, links.list.thought_description, a);
          sg.addEdge(a, links.list.thought_description, p);

          expect(subgraph.search(sg)).to.deep.equal([sg]);
          expect(sg.vertices[m].idea.id).to.deep.equal(mark.id);
          expect(sg.vertices[a].idea.id).to.deep.equal(apple.id);
          expect(sg.vertices[p].idea.id).to.deep.equal(price.id);
        });
      }); // end nextSteps
    }); // end clauses

    it('multi-part search', function() {
      var mark = tools.ideas.create();
      var apple = tools.ideas.create();
      var price = tools.ideas.create({value: 10});
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);

      // search, add vertices/edges, search again
      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark);
      var a = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(m, links.list.thought_description, a);

      expect(subgraph.search(sg)).to.deep.equal([sg]);
      expect(sg.concrete).to.equal(true);

      // add more criteria
      var p = sg.addVertex(subgraph.matcher.similar, {value: 10});
      sg.addEdge(a, links.list.thought_description, p);

      expect(sg.concrete).to.equal(false);
      expect(subgraph.search(sg)).to.deep.equal([sg]);
      expect(sg.concrete).to.equal(true);
    });
  }); // end search

  describe('match', function() {
    var mark, apple, price;
    var outer, m, a, p;
    beforeEach(function() {
      mark = tools.ideas.create();
      apple = tools.ideas.create();
      var money = tools.ideas.create();
      price = tools.ideas.create({value: number.value(10), unit: money.id});
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);

      outer = new subgraph.Subgraph();
      m = outer.addVertex(subgraph.matcher.id, mark);
      a = outer.addVertex(subgraph.matcher.filler);
      p = outer.addVertex(subgraph.matcher.similar, {value: number.value(10)});
      outer.addEdge(m, links.list.thought_description, a);
      outer.addEdge(a, links.list.thought_description, p);

      subgraph.search(outer);
      expect(outer.concrete).to.equal(true);
    });

    it('nothing to do', function() {
      expect(function() { subgraph.match(); }).to.throw(Error);
      expect(function() { subgraph.match(outer); }).to.throw(Error);

      expect(subgraph.match(outer, new subgraph.Subgraph())).to.deep.equal([]);
    });

    // how do you even test srcMapped, !srcMapped, dstMapped, !dstMapped
    it.skip('mapped branching');

    it('fail', function() {
      var result = subgraph.match(outer, new subgraph.Subgraph());
      expect(result).to.deep.equal([]);

      var sg = new subgraph.Subgraph();
      sg.addEdge(sg.addVertex(subgraph.matcher.id, mark), links.list.thought_description, sg.addVertex(subgraph.matcher.id, mark));
      expect(result).to.deep.equal([]);
    });

    it('success single', function() {
      var sg = new subgraph.Subgraph();
      var _p = sg.addVertex(subgraph.matcher.similar, {value: number.value(10)});
      var _m = sg.addVertex(subgraph.matcher.id, mark);
      var _a = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(_m, links.list.thought_description, _a);
      sg.addEdge(_a, links.list.thought_description, _p);
      expect(m).to.not.equal(_m);
      expect(a).to.not.equal(_a);
      expect(p).to.not.equal(_p);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(1);
      expect(Object.keys(result[0]).length).to.equal(3);
      expect(result[0][_m]).to.equal(m);
      expect(result[0][_a]).to.equal(a);
      expect(result[0][_p]).to.equal(p);

      _.forEach(result[0], function(outer, inner) {
        // make sure the forEach works as expected
        // I mean, it does, but I just want the copy-pasta example
        // like, I know how this works, but it's still nice to have overkill
        expect(result[0][inner]).to.equal(outer);
        // this is to ensure our test works
        expect(result[0][outer]).to.not.equal(inner);
      });
    });

    it('success multiple', function() {
      var sg = new subgraph.Subgraph();
      var x = sg.addVertex(subgraph.matcher.filler);
      var y = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(x, links.list.thought_description, y);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(2);

      var res = result[0]; // not sure which is which
      expect(Object.keys(res).length).to.equal(2);
      expect(res[x]).to.equal(m);
      expect(res[y]).to.equal(a);

      res = result[1]; // not sure which is which
      expect(Object.keys(res).length).to.equal(2);
      expect(res[x]).to.equal(a);
      expect(res[y]).to.equal(p);
    });

    it('only id', function() {
      var sg = new subgraph.Subgraph();
      var _m = sg.addVertex(subgraph.matcher.id, mark);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(1);
      expect(result[0][_m]).to.equal(m);
    });

    it('only filler', function() {
      // there are no edges to connect the filler thought to the rest of the graph
      // there's no context to explain where or how it relates to anything
      var sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.filler);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(0);
    });

    it('disjoint + lone id', function() {
      var sg = new subgraph.Subgraph();
      var _m = sg.addVertex(subgraph.matcher.id, mark);
      var _a = sg.addVertex(subgraph.matcher.filler);
      var _p = sg.addVertex(subgraph.matcher.id, price);
      sg.addEdge(_m, links.list.thought_description, _a);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(1);
      expect(result[0][_m]).to.equal(m);
      expect(result[0][_a]).to.equal(a);
      expect(result[0][_p]).to.equal(p);
    });

    it('disjoint + lone filler', function() {
      var sg = new subgraph.Subgraph();
      var _m = sg.addVertex(subgraph.matcher.id, mark);
      var _a = sg.addVertex(subgraph.matcher.filler);
      sg.addVertex(subgraph.matcher.similar, {value: 10});
      sg.addEdge(_m, links.list.thought_description, _a);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(0);
    });

    it('disjoint', function() {
      var banana = tools.ideas.create();
      var bprice = tools.ideas.create({value: 20});
      banana.link(links.list.thought_description, bprice);

      var b = outer.addVertex(subgraph.matcher.id, banana);
      var bp = outer.addVertex(subgraph.matcher.similar, {value: 20});
      outer.addEdge(b, links.list.thought_description, bp);
      subgraph.search(outer);

      expect(outer.concrete).to.equal(true);


      var sg = new subgraph.Subgraph();
      var _m = sg.addVertex(subgraph.matcher.id, mark);
      var _a = sg.addVertex(subgraph.matcher.filler);
      var _p = sg.addVertex(subgraph.matcher.similar, {value: number.value(10)});
      sg.addEdge(_m, links.list.thought_description, _a);
      sg.addEdge(_a, links.list.thought_description, _p);
      var _b = sg.addVertex(subgraph.matcher.filler);
      var _bp = sg.addVertex(subgraph.matcher.similar, {value: 20});
      sg.addEdge(_b, links.list.thought_description, _bp);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(1);
      expect(result[0][_m]).to.equal(m);
      expect(result[0][_a]).to.equal(a);
      expect(result[0][_p]).to.equal(p);
      expect(result[0][_b]).to.equal(b);
      expect(result[0][_bp]).to.equal(bp);
    });

    // it shouldn't matter that the outer is larger
    // but the point is that the vertexMap will match all vertices in the inner map
    // ... this happens a lot; we don't need to test this specifically
//    it.skip('outer larger than inner');

    // inner larger than outer should never be satisfiable
    // does this even need to be a test?
    // ... no
//    it.skip('inner larger than outer');
  }); // end match
  describe('match', function() {
    // transitionable vertices must match by value
    describe('transitionable', function() {
      // test exports.match
      // vertex with idea
      // verify the transitionable rules in exports.match
      it('pre-match', function() {
        var idea = tools.ideas.create();
        var outer = new subgraph.Subgraph();
        var o = outer.addVertex(subgraph.matcher.id, idea);
        var inner = new subgraph.Subgraph();
        var i = inner.addVertex(subgraph.matcher.id, idea);

        // if both are not transitionable, then data doesn't matter
        expect(outer.vertices[o].transitionable).to.equal(false);
        expect(inner.vertices[i].transitionable).to.equal(false);
        expect(subgraph.match(outer, inner).length).to.equal(1);

        // if one is transitionable, then it shouldn't match
        outer.vertices[o].transitionable = true;
        expect(subgraph.match(outer, inner).length).to.equal(0);
        expect(subgraph.match(inner, outer).length).to.equal(0);

        // now with both transitionable, we need to test based on data (unit)
        inner.vertices[i].transitionable = true;

        // neither have data, so it's okay
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(1);

        // if only one has a unit, then it should still match
        // AC: this is because we want to be able to use replace on anything
        // if we know ahead of time that we are going to use combine, then we can fail now
        // but, this shouldn't ever happen in practice
        outer.vertices[o].data = { value: number.value(10), unit: 'a' };
        expect(outer.vertices[o].data).to.deep.equal({ value: number.value(10), unit: 'a' });
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(inner, outer, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(1);
        expect(subgraph.match(inner, outer, false).length).to.equal(1);

        // when the units match, then we should have a match... if the values match
        inner.vertices[i].data = { value: number.value(10), unit: 'a' };
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(inner, outer, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(1);
        expect(subgraph.match(inner, outer, false).length).to.equal(1);
        inner.vertices[i].data = { value: number.value(20), unit: 'a' };
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(inner, outer, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(0);
        expect(subgraph.match(inner, outer, false).length).to.equal(0);

        // and mismatched units should of course not match
        inner.vertices[i].data = { value: number.value(0), unit: 'b' };
        expect(subgraph.match(outer, inner, true).length).to.equal(0);
        expect(subgraph.match(inner, outer, true).length).to.equal(0);
        expect(subgraph.match(outer, inner, false).length).to.equal(0);
        expect(subgraph.match(inner, outer, false).length).to.equal(0);
      });

      // vertex without idea
      // verify the transitionable rules in subgraphMatch
      it('subgraphMatch', function() {
        var id1 = tools.ideas.create();
        var id2 = tools.ideas.create();
        var id3 = tools.ideas.create();
        id1.link(links.list.thought_description, id2);
        id1.link(links.list.thought_description, id3);

        var outer = new subgraph.Subgraph();
        var o1 = outer.addVertex(subgraph.matcher.id, id1);
        var o2 = outer.addVertex(subgraph.matcher.id, id2, false);
        var o3 = outer.addVertex(subgraph.matcher.id, id3, false);
        outer.addEdge(o1, links.list.thought_description, o2);
        outer.addEdge(o1, links.list.thought_description, o3);
        expect(subgraph.search(outer).length).to.equal(1);

        var inner = new subgraph.Subgraph();
        var i = inner.addVertex(subgraph.matcher.filler);
        inner.addEdge(inner.addVertex(subgraph.matcher.id, id1), links.list.thought_description, i);

        // we can only match things with similar transitions
        expect(outer.vertices[o2].transitionable).to.equal(false);
        expect(outer.vertices[o3].transitionable).to.equal(false);
        expect(inner.vertices[i].transitionable).to.equal(false);
        expect(subgraph.match(outer, inner).length).to.equal(2);
        outer.vertices[o2].transitionable = true;
        expect(subgraph.match(outer, inner).length).to.equal(1);
        outer.vertices[o3].transitionable = true;
        expect(subgraph.match(outer, inner).length).to.equal(0);

        // if transitionable is true for both, the unit checking starts to get interesting
        // if units are not defined, then unitOnly must match (because I want to replace)
        inner.vertices[i].transitionable = true;
        expect(subgraph.match(outer, inner).length).to.equal(2);

        // when we define units for both, now they must start matching
        outer.vertices[o2].data = { value: number.value(10), unit: id1.id };
        outer.vertices[o3].data = { value: number.value(10), unit: id2.id };
        inner.vertices[i].data = { value: number.value(20), unit: id1.id };
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(0);
      });
    }); // end transitionable
  }); // end match (part 2)

  describe('rewrite', function() {
    var boolean, money, price, wumpus, any, wumpusUpdateIdea;
    var sg, p, w, a, wu;
    var priceData, wumpusData, priceUpdate, priceUpdate2, wumpusUpdate, wumpusUpdate2, anyData, anyUpdate;

    beforeEach(function() {
      boolean = discrete.definitions.create(['true', 'false', 'maybe']);
      tools.ideas.clean(boolean);
      money = tools.ideas.create();

      priceData = { value: number.value(10), unit: money.id };
      price = tools.ideas.create(priceData);
      wumpusData = { value: 'true', unit: boolean.id };
      wumpus = tools.ideas.create(wumpusData);
      anyData = { thing: 42 };
      any = tools.ideas.create(anyData);

      sg = new subgraph.Subgraph();
      p = sg.addVertex(subgraph.matcher.id, price, true);
      w = sg.addVertex(subgraph.matcher.id, wumpus, true);
      a = sg.addVertex(subgraph.matcher.id, any, true);

      priceUpdate = { value: number.value(20), unit: money.id };
      priceUpdate2 = { value: number.value(30), unit: money.id };
      wumpusUpdate = { value: 'false', unit: boolean.id };
      wumpusUpdate2 = { value: 'maybe', unit: boolean.id };
      anyUpdate = { object: 3.14 };

      // replace_id
      wumpusUpdateIdea = tools.ideas.create(wumpusUpdate);
      wu = sg.addVertex(subgraph.matcher.id, wumpusUpdateIdea);
    });

    afterEach(function() {
      // make sure the value haven't changed
      expect(priceData.value).to.deep.equal(number.value(10));
      expect(priceUpdate.value).to.deep.equal(number.value(20));
      expect(priceUpdate2.value).to.deep.equal(number.value(30));
      expect(wumpusData.value).to.equal('true');
      expect(wumpusUpdate.value).to.equal('false');
      expect(wumpusUpdate2.value).to.equal('maybe');
    });

    it('false starts', function() {
      // not concrete
      sg.addVertex(subgraph.matcher.filler);
      expect(sg.concrete).to.equal(false);
      expect(subgraph.rewrite(sg)).to.equal(undefined);
    });

    it('valildate transitions', function() {
      expect(subgraph.rewrite(sg, ['!@#$ not an id'])).to.equal(undefined);
    });

    describe('!actual', function() {
      it('replace number', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: p, replace: priceUpdate }]);
        expect(sg2).to.be.ok;
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.vertices[p]._data).to.equal(undefined);
        expect(sg2.vertices[p].data).to.deep.equal(priceUpdate);
        // don't update the id
        expect(sg.vertices[p].idea.data()).to.deep.equal(priceData);
        expect(sg2.vertices[p].idea.data()).to.deep.equal(priceData);

        var sg3 = subgraph.rewrite(sg2, [{vertex_id: p, replace: priceUpdate2 }]);
        expect(sg3).to.be.ok;
        expect(sg3).to.not.equal(sg);
        expect(sg3).to.not.equal(sg2);
        // update the new value
        expect(sg.vertices[p]._data).to.equal(undefined);
        expect(sg2.vertices[p].data).to.deep.equal(priceUpdate);
        expect(sg3.vertices[p].data).to.deep.equal(priceUpdate2);
        // don't update the id
        expect(sg.vertices[p].idea.data()).to.deep.equal(priceData);
        expect(sg2.vertices[p].idea.data()).to.deep.equal(priceData);
        expect(sg3.vertices[p].idea.data()).to.deep.equal(priceData);

        // wumpus Data units don't match
        expect(subgraph.rewrite(sg, [{ vertex_id: p, replace: wumpusUpdate }])).to.not.be.ok;

        // replacing any data should be fine
        var sg4 = subgraph.rewrite(sg3, [{ vertex_id: p, replace: anyUpdate }]);
        expect(sg4).to.be.ok;
        expect(sg4).to.not.equal(sg3);
        // update the new value
        expect(sg3.vertices[p].data).to.equal(priceUpdate2);
        expect(sg4.vertices[p].data).to.equal(anyUpdate);
        // don't update the id
        expect(sg3.vertices[p].idea.data()).to.deep.equal(priceData);
        expect(sg4.vertices[p].idea.data()).to.deep.equal(priceData);
      });

      it('replace discrete', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace: wumpusUpdate }]);
        expect(sg2).to.be.ok;
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.vertices[w]._data).to.equal(undefined);
        expect(sg2.vertices[w].data).to.deep.equal(wumpusUpdate);
        // don't update the id
        expect(sg.vertices[w].idea.data()).to.deep.equal(wumpusData);
        expect(sg2.vertices[w].idea.data()).to.deep.equal(wumpusData);

        var sg3 = subgraph.rewrite(sg2, [{vertex_id: w, replace: wumpusUpdate2 }]);
        expect(sg3).to.be.ok;
        expect(sg3).to.not.equal(sg);
        expect(sg3).to.not.equal(sg2);
        // update the new value
        expect(sg.vertices[w]._data).to.equal(undefined);
        expect(sg2.vertices[w].data).to.deep.equal(wumpusUpdate);
        expect(sg3.vertices[w].data).to.deep.equal(wumpusUpdate2);
        // don't update the id
        expect(sg.vertices[w].idea.data()).to.deep.equal(wumpusData);
        expect(sg2.vertices[w].idea.data()).to.deep.equal(wumpusData);
        expect(sg3.vertices[w].idea.data()).to.deep.equal(wumpusData);

        // price Data units don't match
        expect(subgraph.rewrite(sg, [{ vertex_id: w, replace: priceUpdate }])).to.not.be.ok;

        // replacing any data should be fine
        var sg4 = subgraph.rewrite(sg3, [{ vertex_id: w, replace: anyUpdate }]);
        expect(sg4).to.be.ok;
        expect(sg4).to.not.equal(sg3);
        // update the new value
        expect(sg3.vertices[w].data).to.deep.equal(wumpusUpdate2);
        expect(sg4.vertices[w].data).to.deep.equal(anyUpdate);
        // don't update the id
        expect(sg3.vertices[w].idea.data()).to.deep.equal(wumpusData);
        expect(sg4.vertices[w].idea.data()).to.deep.equal(wumpusData);
      });

      it('replace anything', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: a, replace: anyUpdate }]);
        expect(sg2).to.be.ok;
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.vertices[a]._data).to.equal(undefined);
        expect(sg2.vertices[a].data).to.deep.equal(anyUpdate);
        // don't update the id
        expect(sg.vertices[a].idea.data()).to.deep.equal(anyData);
        expect(sg2.vertices[a].idea.data()).to.deep.equal(anyData);

        var sg3 = subgraph.rewrite(sg, [{vertex_id: a, replace: priceUpdate }]);
        expect(sg3).to.be.ok;
        expect(sg3).to.not.equal(sg);
        // update the new value
        expect(sg.vertices[a]._data).to.equal(undefined);
        expect(sg3.vertices[a].data).to.deep.equal(priceUpdate);
        // don't update the id
        expect(sg.vertices[a].idea.data()).to.deep.equal(anyData);
        expect(sg3.vertices[a].idea.data()).to.deep.equal(anyData);

        var sg4 = subgraph.rewrite(sg, [{vertex_id: a, replace: wumpusUpdate }]);
        expect(sg4).to.be.ok;
        expect(sg4).to.not.equal(sg);
        // update the new value
        expect(sg.vertices[a]._data).to.equal(undefined);
        expect(sg4.vertices[a].data).to.deep.equal(wumpusUpdate);
        // don't update the id
        expect(sg.vertices[a].idea.data()).to.deep.equal(anyData);
        expect(sg4.vertices[a].idea.data()).to.deep.equal(anyData);
      });

      it('replace_id', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace_id: wu }]);
        expect(sg2).to.be.ok;
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.vertices[w]._data).to.equal(undefined);
        expect(sg2.vertices[w].data).to.deep.equal(wumpusUpdate);
        // don't update the id
        expect(sg.vertices[w].idea.data()).to.deep.equal(wumpusData);
        expect(sg2.vertices[w].idea.data()).to.deep.equal(wumpusData);
      });

      it('combine number', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: p, combine: priceUpdate }]);
        expect(sg2).to.be.ok;
        expect(sg2).to.not.equal(sg);
        expect(sg2.vertices[p]).to.not.equal(sg.vertices[p]);
        // update the new value
        expect(sg.vertices[p]._data).to.equal(undefined);
        expect(sg2.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
        // don't update the id
        expect(sg.vertices[p].idea.data()).to.deep.equal(priceData);
        expect(sg2.vertices[p].idea.data()).to.deep.equal(priceData);

        var sg3 = subgraph.rewrite(sg2, [{vertex_id: p, combine: priceUpdate2 }]);
        expect(sg3).to.be.ok;
        expect(sg3).to.not.equal(sg);
        expect(sg3).to.not.equal(sg2);
        expect(sg3.vertices[p]).to.not.equal(sg2.vertices[p]);
        expect(sg3.vertices[p].data).to.not.equal(sg2.vertices[p].data);
        // update the new value
        expect(sg.vertices[p]._data).to.equal(undefined);
        expect(sg2.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
        expect(sg3.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(60), unit: money.id });
        // don't update the id
        expect(sg.vertices[p].idea.data()).to.deep.equal(priceData);
        expect(sg2.vertices[p].idea.data()).to.deep.equal(priceData);
        expect(sg3.vertices[p].idea.data()).to.deep.equal(priceData);

        // this should fail for a number of things
        // but we can't combine discrete date or any data
        expect(subgraph.rewrite(sg, [{vertex_id: p, combine: wumpusUpdate }])).to.not.be.ok;
        expect(subgraph.rewrite(sg, [{vertex_id: p, combine: anyUpdate }])).to.not.be.ok;
      });

      it('combine discrete', function() {
        expect(subgraph.rewrite(sg, [{vertex_id: w, combine: wumpusUpdate }])).to.not.be.ok;
        expect(subgraph.rewrite(sg, [{vertex_id: w, combine: priceUpdate }])).to.not.be.ok;
        expect(subgraph.rewrite(sg, [{vertex_id: w, combine: anyUpdate }])).to.not.be.ok;
      });

      it('combine anything', function() {
        expect(subgraph.rewrite(sg, [{vertex_id: a, combine: anyUpdate }])).to.not.be.ok;
        expect(subgraph.rewrite(sg, [{vertex_id: a, combine: priceUpdate }])).to.not.be.ok;
        expect(subgraph.rewrite(sg, [{vertex_id: a, combine: wumpusUpdate }])).to.not.be.ok;
      });
    }); // end !actual

    it('actual', function() {
      // replace number
      var sg2 = subgraph.rewrite(sg, [{vertex_id: p, replace: priceUpdate }], true);
      expect(sg2).to.be.ok;
      expect(sg2).to.equal(sg);
      expect(sg.vertices[p].data).to.deep.equal(priceUpdate);
      expect(sg.vertices[p].idea.data()).to.deep.equal(priceUpdate);

      // replace discrete
      sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace: wumpusUpdate2 }], true);
      expect(sg2).to.be.ok;
      expect(sg2).to.equal(sg);
      expect(sg.vertices[w].data).to.deep.equal(wumpusUpdate2);
      expect(sg.vertices[w].idea.data()).to.deep.equal(wumpusUpdate2);

      // replace_id
      sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace_id: wu }], true);
      expect(sg2).to.be.ok;
      expect(sg2).to.equal(sg);
      expect(sg.vertices[w].data).to.deep.equal(wumpusUpdate);
      expect(sg.vertices[w].idea.data()).to.deep.equal(wumpusUpdate);

      // combine number
      sg2 = subgraph.rewrite(sg, [{vertex_id: p, combine: priceUpdate }], true);
      expect(sg2).to.be.ok;
      expect(sg2).to.equal(sg);
      // note: our previous update (replace) has taken effect; we are combining priceUpdate twice
      expect(sg.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(40), unit: money.id });
      expect(sg2.vertices[p].idea.data()).to.deep.equal({ type: 'lime_number', value: number.value(40), unit: money.id });

      // combine discrete
      sg2 = subgraph.rewrite(sg, [{vertex_id: w, combine: wumpusData }], true);
      expect(sg2).to.equal(undefined);
    });
  }); // end rewrite
}); // end subgraph
