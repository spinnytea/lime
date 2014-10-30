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
    expect(Object.keys(subgraph)).to.deep.equal(['Subgraph', 'matcher', 'search', 'match', 'rewrite']);
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
      sg.addVertex(subgraph.matcher.data.similar, {value: 10});
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
      var p = sg.addVertex(subgraph.matcher.data.similar, {value: 10});
      sg.addEdge(m, links.list.thought_description, a);
      sg.addEdge(a, links.list.thought_description, p);
      var bp = sg.addVertex(subgraph.matcher.data.similar, {value: 20});

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
          var p = sg.addVertex(subgraph.matcher.data.similar, {value: 10});
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
      var p = sg.addVertex(subgraph.matcher.data.similar, {value: 10});
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
      price = tools.ideas.create({value: 10});
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);

      outer = new subgraph.Subgraph();
      m = outer.addVertex(subgraph.matcher.id, mark);
      a = outer.addVertex(subgraph.matcher.filler);
      p = outer.addVertex(subgraph.matcher.data.similar, {value: 10});
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
    it.skip('match filter');

    it('fail', function() {
      var result = subgraph.match(outer, new subgraph.Subgraph());
      expect(result).to.deep.equal([]);

      var sg = new subgraph.Subgraph();
      sg.addEdge(sg.addVertex(subgraph.matcher.id, mark), links.list.thought_description, sg.addVertex(subgraph.matcher.id, mark));
      expect(result).to.deep.equal([]);
    });

    it('success single', function() {
      var sg = new subgraph.Subgraph();
      var _p = sg.addVertex(subgraph.matcher.data.similar, {value: 10});
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
      sg.addVertex(subgraph.matcher.data.similar, {value: 10});
      sg.addEdge(_m, links.list.thought_description, _a);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(0);
    });

    it('disjoint', function() {
      var banana = tools.ideas.create();
      var bprice = tools.ideas.create({value: 20});
      banana.link(links.list.thought_description, bprice);

      var b = outer.addVertex(subgraph.matcher.id, banana);
      var bp = outer.addVertex(subgraph.matcher.data.similar, {value: 20});
      outer.addEdge(b, links.list.thought_description, bp);
      subgraph.search(outer);

      expect(outer.concrete).to.equal(true);


      var sg = new subgraph.Subgraph();
      var _m = sg.addVertex(subgraph.matcher.id, mark);
      var _a = sg.addVertex(subgraph.matcher.filler);
      var _p = sg.addVertex(subgraph.matcher.data.similar, {value: 10});
      sg.addEdge(_m, links.list.thought_description, _a);
      sg.addEdge(_a, links.list.thought_description, _p);
      var _b = sg.addVertex(subgraph.matcher.filler);
      var _bp = sg.addVertex(subgraph.matcher.data.similar, {value: 20});
      sg.addEdge(_b, links.list.thought_description, _bp);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(1);
      expect(result[0][_m]).to.equal(m);
      expect(result[0][_a]).to.equal(a);
      expect(result[0][_p]).to.equal(p);
      expect(result[0][_b]).to.equal(b);
      expect(result[0][_bp]).to.equal(bp);
    });
  }); // end matchSubgraph

  describe('rewrite', function() {
    var boolean, money, price, wumpus;
    var sg, p, w;
    var priceData, wumpusData, priceUpdate, wumpusUpdate;

    beforeEach(function() {
      boolean = discrete.definitions.create(['true', 'false']);
      tools.ideas.clean(boolean);
      money = tools.ideas.create();

      priceData = { value: number.value(10), unit: money.id };
      price = tools.ideas.create(priceData);
      wumpusData = { value: 'true', unit: boolean.id };
      wumpus = tools.ideas.create(wumpusData);

      sg = new subgraph.Subgraph();
      p = sg.addVertex(subgraph.matcher.id, price);
      w = sg.addVertex(subgraph.matcher.id, wumpus);

      priceUpdate = { value: number.value(20), unit: money.id };
      wumpusUpdate = { value: 'true', unit: boolean.id };
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

    it('!actual', function() {
      var sg2 = subgraph.rewrite(sg, [{vertex_id: p, replace: priceUpdate }]);
      expect(sg2).to.be.ok;
      expect(sg2).to.not.equal(sg);
      // update the new value
      expect(sg.vertices[p].data).to.equal(undefined);
      expect(sg2.vertices[p].data).to.deep.equal(priceUpdate);
      // don't update the id
      expect(sg.vertices[p].idea.data()).to.deep.equal(priceData);
      expect(sg2.vertices[p].idea.data()).to.deep.equal(priceData);

      sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace: wumpusUpdate }]);
      expect(sg2).to.be.ok;
      expect(sg2).to.not.equal(sg);
      // update the new value
      expect(sg.vertices[w].data).to.equal(undefined);
      expect(sg2.vertices[w].data).to.deep.equal(wumpusUpdate);
      // don't update the id
      expect(sg.vertices[w].idea.data()).to.deep.equal(wumpusData);
      expect(sg2.vertices[w].idea.data()).to.deep.equal(wumpusUpdate);

      sg2 = subgraph.rewrite(sg, [{vertex_id: p, combine: priceUpdate }]);
      expect(sg2).to.be.ok;
      expect(sg2).to.not.equal(sg);
      // update the new value
      expect(sg.vertices[p].data).to.equal(undefined);
      expect(sg2.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
      // don't update the id
      expect(sg.vertices[p].idea.data()).to.deep.equal(priceData);
      expect(sg2.vertices[p].idea.data()).to.deep.equal(priceData);

      sg2 = subgraph.rewrite(sg, [{vertex_id: w, combine: wumpusData }]);
      expect(sg2).to.equal(undefined);
    });

    it('actual', function() {
      var sg2 = subgraph.rewrite(sg, [{vertex_id: p, replace: priceUpdate }], true);
      expect(sg2).to.be.ok;
      expect(sg2).to.equal(sg);
      expect(sg.vertices[p].data).to.deep.equal(priceUpdate);
      expect(sg.vertices[p].idea.data()).to.deep.equal(priceUpdate);

      sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace: wumpusUpdate }], true);
      expect(sg2).to.be.ok;
      expect(sg2).to.equal(sg);
      expect(sg.vertices[w].data).to.deep.equal(wumpusUpdate);
      expect(sg.vertices[w].idea.data()).to.deep.equal(wumpusUpdate);

      sg2 = subgraph.rewrite(sg, [{vertex_id: p, combine: priceUpdate }], true);
      expect(sg2).to.be.ok;
      expect(sg2).to.equal(sg);
      // note: our previous update (replace) has taken effect; we are combining priceUpdate twice
      expect(sg.vertices[p].data).to.deep.equal({ type: 'lime_number', value: number.value(40), unit: money.id });
      expect(sg2.vertices[p].idea.data()).to.deep.equal({ type: 'lime_number', value: number.value(40), unit: money.id });

      sg2 = subgraph.rewrite(sg, [{vertex_id: w, combine: wumpusData }], true);
      expect(sg2).to.equal(undefined);
    });
  }); // end rewrite
}); // end subgraph
