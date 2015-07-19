'use strict';
var expect = require('chai').expect;
var links = require('../../../src/database/links');
var subgraph = require('../../../src/database/subgraph');
var tools = require('../../testingTools');

describe('subgraph', function() {
  describe('search', function() {
    it('init', function() {
      expect(Object.keys(subgraph.search.units)).to.deep.equal(['findEdgeToExpand', 'expandEdge']);
    });

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
      expect(sg.getIdea(m).id).to.deep.equal(mark.id);
      expect(sg.getIdea(a).id).to.deep.equal(apple.id);
      expect(sg.getIdea(p).id).to.deep.equal(price.id);
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
      describe('matchRef', function() {
        var fruit, apple, banana;
        var mark, desire;
        beforeEach(function() {
          fruit = tools.ideas.create();
          apple = tools.ideas.create({name: 'apple'});
          banana = tools.ideas.create({name: 'banana'});
          fruit.link(links.list.thought_description, apple);
          fruit.link(links.list.thought_description, banana);

          mark = tools.ideas.create();
          desire = tools.ideas.create();
          mark.link(links.list.thought_description, desire);
        });

        // put both success and fail in the one test
        // (the success is enough to prove that this works)
        it('isSrc', function() {
          var sg = new subgraph.Subgraph();
          var m = sg.addVertex(subgraph.matcher.id, mark);
          var d = sg.addVertex(subgraph.matcher.filler);
          sg.addEdge(m, links.list.thought_description, d);

          var f = sg.addVertex(subgraph.matcher.id, fruit);
          var _f = sg.addVertex(subgraph.matcher.exact, d, {matchRef:true});
          sg.addEdge(f, links.list.thought_description, _f, 1); // make the pref higher to ensure this is considered first

          desire.update({name: 'apple'});

          expect(subgraph.search(sg)).to.deep.equal([sg]);
          expect(sg.getIdea(_f).id).to.equal(apple.id);
        });

        it('idDst', function() {
          var sg = new subgraph.Subgraph();
          var m = sg.addVertex(subgraph.matcher.id, mark);
          var d = sg.addVertex(subgraph.matcher.filler);
          sg.addEdge(m, links.list.thought_description, d);

          var f = sg.addVertex(subgraph.matcher.id, fruit);
          var _f = sg.addVertex(subgraph.matcher.exact, d, {matchRef:true});
          // make the pref higher to ensure this is considered first
          // hook up this edge backwards (so we can test isDst)
          sg.addEdge(_f, links.list.thought_description.opposite, f, 1);

          desire.update({name: 'banana'});

          expect(subgraph.search(sg)).to.deep.equal([sg]);
          expect(sg.getIdea(_f).id).to.equal(banana.id);
        });
      }); // end matchRef

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
          expect(sg.getIdea(m).id).to.deep.equal(mark.id);
          expect(sg.getIdea(a).id).to.deep.equal(apple.id);
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
      describe('selectedEdge', function() {
        it('isSrc && isDst mismatch', function() {
          var fruit, apple, banana;
          fruit = tools.ideas.create();
          apple = tools.ideas.create({name: 'apple'});
          banana = tools.ideas.create({name: 'banana'});
          fruit.link(links.list.thought_description, apple);
          fruit.link(links.list.thought_description, banana);

          var sg = new subgraph.Subgraph();
          var f = sg.addVertex(subgraph.matcher.id, fruit);
          var a = sg.addVertex(subgraph.matcher.id, apple);
          // we need banana in the test since the idea for fruit and apple will be deleted
          var b = sg.addVertex(subgraph.matcher.id, banana);
          sg.addEdge(f, links.list.thought_description, a, 1); // expand this edge second
          sg.addEdge(f, links.list.thought_description, b, 2); // expand this edge first
          expect(sg.concrete).to.equal(true);

          // expand this edge last
          // by the time we get here, f and a will be pinned down
          // but this edge is invalid, so the search will fail
          sg.addEdge(a, links.list.type_of, f, 0);

          // for our sanity, verify the underlying state
          expect(sg.concrete).to.equal(false);
          expect(sg.getIdea(f)).to.equal(undefined);
          expect(sg.getIdea(a)).to.equal(undefined);
          expect(sg.getIdea(b).id).to.equal(banana.id); // this is our defined node to allow the search

          // our test case
          expect(subgraph.search(sg)).to.deep.equal([]);
        });
      }); // end selectedEdge (part 2)

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
          var f = sg.addVertex(subgraph.matcher.filler);
          sg.addEdge(m, links.list.thought_description, f);

          var result = subgraph.search(sg);
          expect(result.length).to.equal(2);

          var one = result[0];
          expect(one).to.not.equal(sg);
          expect(one.getIdea(m).id).to.deep.equal(mark.id);
          expect(one.getIdea(f).id).to.deep.equal(apple.id);

          var two = result[1];
          expect(two).to.not.equal(sg);
          expect(two.getIdea(m).id).to.deep.equal(mark.id);
          expect(two.getIdea(f).id).to.deep.equal(banana.id);
        });

        it.skip('not sure what to call this', function() {
          // idea graph: root -> a
          // subgraph: i <- root -> j
          // subgraph should fail
          // it should not i=a, j=a
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
          expect(sg.getIdea(m).id).to.deep.equal(mark.id);
          expect(sg.getIdea(a).id).to.deep.equal(apple.id);
          expect(sg.getIdea(p).id).to.deep.equal(price.id);
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

    it.skip('findEdgeToExpand');

    it.skip('expandEdge');
  }); // end search
}); // end subgraph