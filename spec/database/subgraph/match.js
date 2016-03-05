'use strict';
var expect = require('chai').expect;
var discrete = require('../../../src/planning/primitives/discrete');
var ideas = require('../../../src/database/ideas');
var links = require('../../../src/database/links');
var number = require('../../../src/planning/primitives/number');
var subgraph = require('../../../src/database/subgraph');

// @param match: the result of subgraph.match ([vertexMap])
function checkSubgraphMatch(match, outer, inner) {
  if(match.hasOwnProperty('length'))
    match = match[0];
  expect(match).to.be.an('object');

  // make sure the outer and inner values are not the same
  // it may be subtle, but it helps to ensure this test is valid
  // XXX or does it, now that I have this function
//  expect(outer).to.not.deep.equal(inner);

  expect(outer.length).to.equal(inner.length);
  expect(Object.keys(match).length).to.equal(inner.length);
  inner.forEach(function(k, idx) {
    expect(match[k]).to.equal(outer[idx]);
  });
}

describe('subgraph', function() {
  describe('match', function() {
    require('../ideas').mock();

    var context, mark, apple, price;
    var outer, c, m, a, p;
    beforeEach(function() {
      context = ideas.create();
      mark = ideas.create();
      apple = ideas.create();
      var money = ideas.create();
      price = ideas.create({value: number.value(10), unit: money.id});
      mark.link(links.list.context, context);
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);

      outer = new subgraph.Subgraph();
      c = outer.addVertex(subgraph.matcher.id, context);
      m = outer.addVertex(subgraph.matcher.id, mark);
      a = outer.addVertex(subgraph.matcher.filler);
      p = outer.addVertex(subgraph.matcher.similar, {value: number.value(10)});
      outer.addEdge(m, links.list.context, c);
      outer.addEdge(m, links.list.thought_description, a);
      outer.addEdge(a, links.list.thought_description, p);

      subgraph.search(outer);
      expect(outer.concrete).to.equal(true);
    });

    it('nothing to do', function() {
      expect(function() { subgraph.match(); }).to.throw(Error);
      expect(function() { subgraph.match(outer); }).to.throw(Error);

      expect(subgraph.match(outer, new subgraph.Subgraph())).to.deep.equal([]);

      outer.addVertex(subgraph.matcher.filler);
      expect(outer.concrete).to.equal(false);
      expect(function() { subgraph.match(outer, new subgraph.Subgraph()); }).to.throw('the outer subgraph must be concrete before you can match against it');
    });

    // how do you even test srcMapped, !srcMapped, dstMapped, !dstMapped
    // and do we even care to test it
    // I've been over the logic QUITE A LOT (erma gerd) I'm pretty sure it's correct
//    it.skip('mapped branching');

    it.skip('isSrc && isDst mismatch');

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

      checkSubgraphMatch(subgraph.match(outer, sg), [m, a, p], [_m, _a, _p]);
    });

    it('success multiple', function() {
      var sg = new subgraph.Subgraph();
      var x = sg.addVertex(subgraph.matcher.filler);
      var y = sg.addVertex(subgraph.matcher.filler);
      sg.addEdge(x, links.list.thought_description, y);

      var result = subgraph.match(outer, sg);
      expect(result.length).to.equal(2);

      // not sure which is which
      // so if this fails, just try swapping 0 and 1 indexes
      checkSubgraphMatch(result[0], [m, a], [x, y]);
      checkSubgraphMatch(result[1], [a, p], [x, y]);
    });

    it('only id', function() {
      var sg = new subgraph.Subgraph();
      var _m = sg.addVertex(subgraph.matcher.id, mark);

      checkSubgraphMatch(subgraph.match(outer, sg), [m], [_m]);
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

      checkSubgraphMatch(subgraph.match(outer, sg), [m, a, p], [_m, _a, _p]);
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
      var banana = ideas.create();
      var bprice = ideas.create({value: 20});
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

      checkSubgraphMatch(subgraph.match(outer, sg), [m, a, p, b, bp], [_m, _a, _p, _b, _bp]);
    });

    // when we construct subgraphs, each node represents a single idea
    // it doesn't make sense to intend multiple nodes to match the same idea
    // ... these tests don't make sense; they break the definition of a subgraph
    // ... unless they are negative tests? but how do we even DO that
    // what if there are multiple vertices in the outer graph that point to the same idea?
    //it.skip('multiple outer to same idea');
    // what if there are multiple vertices in the inner graph that point to the same idea?
    //it.skip('multiple inner to same idea');

    // it shouldn't matter that the outer is larger
    // but the point is that the vertexMap will match all vertices in the inner map
    // ... this happens a lot; we don't need to test this specifically
//    it.skip('outer larger than inner');

    // inner larger than outer should never be satisfiable
    it('inner larger than outer', function() {
      var o = new subgraph.Subgraph();
      var o_m = o.addVertex(subgraph.matcher.id, mark);
      var o_a = o.addVertex(subgraph.matcher.filler);
      o.addEdge(o_m, links.list.thought_description, o_a);

      var i = new subgraph.Subgraph();
      var i_m = i.addVertex(subgraph.matcher.id, mark);
      var i_a = i.addVertex(subgraph.matcher.filler);
      var i_p = i.addVertex(subgraph.matcher.similar, {value: number.value(10)});
      i.addEdge(i_m, links.list.thought_description, i_a);
      i.addEdge(i_a, links.list.thought_description, i_p);

      expect(o.concrete).to.equal(false);
      expect(i.concrete).to.equal(false);
      expect(subgraph.search(o).length).to.equal(1);
      expect(subgraph.search(i.copy()).length).to.equal(1);
      expect(o.concrete).to.equal(true);
      expect(i.concrete).to.equal(false);

      // okay, the test is setup correctly

      expect(subgraph.match(o, i)).to.deep.equal([]);
    });
  }); // end match (part 1)

  describe('match', function() {
    require('../ideas').mock();

    // transitionable vertices must match by value
    describe('transitionable', function() {
      // test exports.match
      // vertex with idea
      // verify the transitionable rules in exports.match
      it('pre-match', function() {
        var idea = ideas.create();
        var outer = new subgraph.Subgraph();
        var o = outer.addVertex(subgraph.matcher.id, idea);
        var inner = new subgraph.Subgraph();
        var i = inner.addVertex(subgraph.matcher.id, idea);

        // if both are not transitionable, then data doesn't matter
        expect(outer.getMatch(o).options.transitionable).to.equal(false);
        expect(inner.getMatch(i).options.transitionable).to.equal(false);
        expect(subgraph.match(outer, inner).length).to.equal(1);

        // if the inner is transitionable, and the outer is not, then it should fail
        // if the outer is transitionable, but the inner is not, then it should pass (because why not?)
        outer.getMatch(o).options.transitionable = true;
        expect(subgraph.match(outer, inner).length).to.equal(1); // AC: if inner=false & outer=true, it can transition
        expect(subgraph.match(inner, outer).length).to.equal(0);

        // now with both transitionable, we need to test based on data (unit)
        inner.getMatch(i).options.transitionable = true;

        // neither have data, so it's okay
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(1);

        // if only one has a unit, then it should still match
        // AC: this is because we want to be able to use replace on anything
        // if we know ahead of time that we are going to use combine, then we can fail now
        // but, this shouldn't ever happen in practice
        outer.setData(o, { value: number.value(10), unit: idea.id });
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(inner, outer, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(1);
        expect(subgraph.match(inner, outer, false).length).to.equal(1);

        // when the units match, then we should have a match... if the values match
        inner.setData(i, { value: number.value(10), unit: idea.id });
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(inner, outer, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(1);
        expect(subgraph.match(inner, outer, false).length).to.equal(1);
        inner.setData(i, { value: number.value(20), unit: idea.id });
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(inner, outer, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(0);
        expect(subgraph.match(inner, outer, false).length).to.equal(0);

        // and mismatched units should of course not match
        inner.setData(i, { value: number.value(0), unit: '0' });
        expect(subgraph.match(outer, inner, true).length).to.equal(0);
        expect(subgraph.match(inner, outer, true).length).to.equal(0);
        expect(subgraph.match(outer, inner, false).length).to.equal(0);
        expect(subgraph.match(inner, outer, false).length).to.equal(0);
      });

      // vertex without idea
      // verify the transitionable rules in subgraphMatch
      it('subgraphMatch', function() {
        var id1 = ideas.create();
        var id2 = ideas.create();
        var id3 = ideas.create();
        id1.link(links.list.thought_description, id2);
        id1.link(links.list.thought_description, id3);

        var outer = new subgraph.Subgraph();
        var o1 = outer.addVertex(subgraph.matcher.id, id1);
        var o2 = outer.addVertex(subgraph.matcher.id, id2, {transitionable:false});
        var o3 = outer.addVertex(subgraph.matcher.id, id3, {transitionable:false});
        outer.addEdge(o1, links.list.thought_description, o2);
        outer.addEdge(o1, links.list.thought_description, o3);
        expect(subgraph.search(outer).length).to.equal(1);

        var inner = new subgraph.Subgraph();
        var i = inner.addVertex(subgraph.matcher.filler);
        inner.addEdge(inner.addVertex(subgraph.matcher.id, id1), links.list.thought_description, i);

        // if inner is transitionable, then outer must be too
        // if inner is not transitionable, then outer doesn't matter
        outer.getMatch(o2).options.transitionable = true;
        expect(outer.getMatch(o2).options.transitionable).to.equal(true);
        expect(outer.getMatch(o3).options.transitionable).to.equal(false);
        expect(inner.getMatch(i).options.transitionable).to.equal(false);
        expect(subgraph.match(outer, inner).length).to.equal(2);
        inner.getMatch(i).options.transitionable = true;
        expect(subgraph.match(outer, inner).length).to.equal(1);

        // if transitionable is true for both, the unit checking starts to get interesting
        // if units are not defined, then unitOnly must match (because I want to replace)
        outer.getMatch(o3).options.transitionable = true;
        expect(subgraph.match(outer, inner).length).to.equal(2);

        // when we define units for both, now they must start matching
        outer.setData(o2, { value: number.value(10), unit: id1.id });
        outer.setData(o3, { value: number.value(10), unit: id2.id });
        inner.setData(i, { value: number.value(20), unit: id1.id });
        expect(subgraph.match(outer, inner, true).length).to.equal(1);
        expect(subgraph.match(outer, inner, false).length).to.equal(0);
      });
    }); // end transitionable

    describe('matchRef', function() {
//      it.skip('pre-match');

      it('unit only', function() {
        var unit = ideas.create();
        var v1 = ideas.create({ value: number.value(5), unit: unit.id });
        var v2 = ideas.create({ value: number.value(15), unit: unit.id });
        unit.link(links.list.thought_description, v1);
        unit.link(links.list.thought_description, v2);

        var outer = new subgraph.Subgraph();
        var o_unit = outer.addVertex(subgraph.matcher.id, unit);
        var o_v1 = outer.addVertex(subgraph.matcher.id, v1, {transitionable:true});
        var o_v2 = outer.addVertex(subgraph.matcher.id, v2, {transitionable:true});
        outer.addEdge(o_unit, links.list.thought_description, o_v1);
        outer.addEdge(o_unit, links.list.thought_description, o_v2);
        expect(outer.concrete).to.equal(true);

        var inner = new subgraph.Subgraph();
        var i_unit = inner.addVertex(subgraph.matcher.id, unit);
        var i_v = inner.addVertex(subgraph.matcher.number, i_unit, {transitionable:true,matchRef:true});
        inner.addEdge(i_unit, links.list.thought_description, i_v);

        unit.update({ value: number.value(5), unit: unit.id });

        checkSubgraphMatch(subgraph.match(outer, inner), [o_unit, o_v1], [i_unit, i_v]);


        var result = subgraph.match(outer, inner, true);
        expect(result.length).to.equal(2);
        // not sure which is which
        checkSubgraphMatch(result[0], [o_unit, o_v1], [i_unit, i_v]);
        // not sure which is which
        checkSubgraphMatch(result[1], [o_unit, o_v2], [i_unit, i_v]);
      });

      describe('subgraphMatch', function() {
        var mark, desire, apple;
        var outer, om, od, o_;
        beforeEach(function() {
          mark = ideas.create({name: 'mark'}); // anchor
          desire = ideas.create({name: 'apple'}); // matchRef
          apple = ideas.create({name: 'apple', target: true}); // target
          var banana = ideas.create({name: 'banana'}); // distractor
          mark.link(links.list.thought_description, desire);
          mark.link(links.list.thought_description, apple);
          mark.link(links.list.thought_description, banana);

          outer = new subgraph.Subgraph();
          om = outer.addVertex(subgraph.matcher.id, mark);
          od = outer.addVertex(subgraph.matcher.id, desire);
          o_ = outer.addVertex(subgraph.matcher.id, apple);
          outer.addEdge(om, links.list.thought_description, od);
          outer.addEdge(om, links.list.thought_description, o_);

          expect(outer.concrete).to.equal(true);
        });

        // this test doesn't really matter since it won't use the matchers
        // if the inner is concrete, then it just matches the vertices
        // matchRef doesn't matter in this case
//        it.skip('inner concrete');

        it('inner target w/ data', function() {
          var prep = new subgraph.Subgraph();
          var im = prep.addVertex(subgraph.matcher.id, mark);
          var id = prep.addVertex(subgraph.matcher.id, desire);
          prep.addEdge(im, links.list.thought_description, id);

          var inner;
          var i_ = prep.addVertex(subgraph.matcher.similar, id, {matchRef:true});

          inner = prep.copy();
          inner.addEdge(im, links.list.thought_description, i_, { pref: -1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(im, links.list.thought_description, i_, { pref: 1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);

          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, { pref: -1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, { pref: 1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
        });

        it('outer target mapped / not mapped', function() {
          var prep = new subgraph.Subgraph();
          var im = prep.addVertex(subgraph.matcher.id, mark);
          var id = prep.addVertex(subgraph.matcher.exact, {name: 'apple'});
          prep.addEdge(im, links.list.thought_description, id);

          var inner;
          var i_ = prep.addVertex(subgraph.matcher.similar, id, {matchRef:true});

          inner = prep.copy();
          inner.addEdge(im, links.list.thought_description, i_, { pref: -1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(im, links.list.thought_description, i_, { pref: 1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);

          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, { pref: -1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, { pref: 1 });
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
        });

        it('matchData not a vertex', function() {
          var prep = new subgraph.Subgraph();
          var im = prep.addVertex(subgraph.matcher.id, mark);
          var id = prep.addVertex(subgraph.matcher.id, desire);
          prep.addEdge(im, links.list.thought_description, id);

          expect(function() {
            prep.addVertex(subgraph.matcher.id, 'not a vertex', {matchRef:true});
          }).to.throw(Error);

          expect(function() {
            prep.addVertex(subgraph.matcher.id, undefined, {matchRef:true});
          }).to.throw(Error);
        });

        it.skip('matchRef against matcher.id');
      }); // end subgraphMatch

      it('edge case 1', function() {
        // came about from lm-wumpus discreteActuators forward
        //
        // two sets of nodes
        // root -> bool -> number
        //
        // first, we'll test if they match with the same data
        // then we need to make sure they don't match when b has different data
        //
        // the edge case is how the inner subgraph uses it's matchers
        // the two roots act as anchors for different branches
        // branch a will use discrete/number matchers
        // branch b will use discrete/number matchers via matchRef
        var a_root = ideas.create();
        var a_crt = ideas.create(discrete.cast({value: true, unit: discrete.definitions.list.boolean}));
        var a_num = ideas.create(number.cast({value: number.value(1), unit: '0'}));
        a_root.link(links.list.thought_description, a_crt);
        a_crt.link(links.list.thought_description, a_num);
        var b_root = ideas.create();
        var b_crt = ideas.create(a_crt.data());
        var b_num = ideas.create(a_num.data());
        b_root.link(links.list.thought_description, b_crt);
        b_crt.link(links.list.thought_description, b_num);

        // the outer is pretty straight forward, all matchers are based in ids
        // no need to even search
        var outer = new subgraph.Subgraph();
        var oa_root = outer.addVertex(subgraph.matcher.id, a_root);
        var oa_crt = outer.addVertex(subgraph.matcher.id, a_crt);
        var oa_num = outer.addVertex(subgraph.matcher.id, a_num);
        outer.addEdge(oa_root, links.list.thought_description, oa_crt);
        outer.addEdge(oa_crt, links.list.thought_description, oa_num);
        var ob_root = outer.addVertex(subgraph.matcher.id, b_root);
        var ob_crt = outer.addVertex(subgraph.matcher.id, b_crt, {transitionable:true});
        var ob_num = outer.addVertex(subgraph.matcher.id, b_num, {transitionable:true});
        outer.addEdge(ob_root, links.list.thought_description, ob_crt);
        outer.addEdge(ob_crt, links.list.thought_description, ob_num);
        expect(outer.concrete).to.equal(true);

        // a uses discrete/number against the data
        // b uses discrete/number against a using matchRef
        var inner = new subgraph.Subgraph();
        var ia_root = inner.addVertex(subgraph.matcher.id, a_root);
        var ia_crt = inner.addVertex(subgraph.matcher.discrete, a_crt.data());
        var ia_num = inner.addVertex(subgraph.matcher.number, a_num.data());
        inner.addEdge(ia_root, links.list.thought_description, ia_crt);
        inner.addEdge(ia_crt, links.list.thought_description, ia_num);
        var ib_root = inner.addVertex(subgraph.matcher.id, b_root);
        var ib_crt = inner.addVertex(subgraph.matcher.discrete, ia_crt, {transitionable:true,matchRef:true});
        var ib_num = inner.addVertex(subgraph.matcher.number, ia_num, {transitionable:true,matchRef:true});
        inner.addEdge(ib_root, links.list.thought_description, ib_crt);
        inner.addEdge(ib_crt, links.list.thought_description, ib_num);
        expect(inner.concrete).to.equal(false);

        // save off our list of keys so we don't need to copypasta this list
        var outerKeys = [oa_root, oa_crt, oa_num, ob_root, ob_crt, ob_num];
        var innerKeys = [ia_root, ia_crt, ia_num, ib_root, ib_crt, ib_num];


        // now... test our edge case to make sure we have the correct data
        checkSubgraphMatch(subgraph.match(outer, inner), outerKeys, innerKeys);
        checkSubgraphMatch(subgraph.match(outer, inner, true), outerKeys, innerKeys);

        // well... that simply worked as expected


        // now lets mess with the values a bit more
        b_num.update(number.cast({value: number.value(5), unit: '0'}));
        outer.deleteData();
        expect(subgraph.match(outer, inner)).to.deep.equal([]); // no specific matches
        checkSubgraphMatch(subgraph.match(outer, inner, true), outerKeys, innerKeys); // we do have matches by unit
        inner.getMatch(ib_num).options.transitionable = false;
        expect(subgraph.match(outer, inner, true)).to.deep.equal([]); // unless we say the value isn't transitionable

        // back to our roots
        b_num.update(a_num.data());
        inner.getMatch(ib_num).options.transitionable = true;
        outer.deleteData();
        checkSubgraphMatch(subgraph.match(outer, inner), outerKeys, innerKeys);
        checkSubgraphMatch(subgraph.match(outer, inner, true), outerKeys, innerKeys);


        // same thing with crt
        b_crt.update(discrete.cast({value: false, unit: discrete.definitions.list.boolean}));
        outer.deleteData();
        expect(subgraph.match(outer, inner)).to.deep.equal([]); // no specific matches
        checkSubgraphMatch(subgraph.match(outer, inner, true), outerKeys, innerKeys); // we do have matches by unit
        inner.getMatch(ib_crt).options.transitionable = false;
        expect(subgraph.match(outer, inner, true)).to.deep.equal([]); // unless we say the value isn't transitionable

        //// back to our roots
        //b_crt.update(a_crt.data());
        //inner.getMatch(ib_crt).options.transitionable = true;
        //outer.deleteData();
        //checkSubgraphMatch(subgraph.match(outer, inner), outerKeys, innerKeys);
        //checkSubgraphMatch(subgraph.match(outer, inner, true), outerKeys, innerKeys);
      });
    }); // end matchRef

    describe('units', function() {
      it('init', function() {
        // this is to ensure we test everything
        expect(Object.keys(subgraph.match.units)).to.deep.equal(['initSubgraphMatchData', 'initializeVertexMap', 'subgraphMatch', 'filterOuter', 'resolveMatchData', 'vertexTransitionableAcceptable', 'vertexFixedMatch']);
      });

      it.skip('initSubgraphMatchData');

      it.skip('initializeVertexMap');

      it.skip('subgraphMatch');

      it.skip('filterOuter');

      describe('resolveMatchData', function() {
        // this function expects subgraph to behave in a particular way
        // so we can't simply pass in values for inner and outer
        var idea;
        var inner, i, im;
        var outer, o;
        var sgMD;
        beforeEach(function() {
          idea = ideas.create();
          inner = new subgraph.Subgraph();
          i = inner.addVertex(subgraph.matcher.filler);
          im = inner.addVertex(subgraph.matcher.filler, i, {matchRef:true});
          outer = new subgraph.Subgraph();
          o = outer.addVertex(subgraph.matcher.filler);

          sgMD = {
            inner: inner,
            outer: outer,
            vertexMap: {}
          };
        });

        it('use inner data', function() {
          idea.update({loc:'data'});
          inner.setData(i, {loc:'cache'});
          var resolve = function() {
            return subgraph.match.units.resolveMatchData(sgMD, i, inner.getMatch(i));
          };

          // !matchRef
          expect(resolve()).to.deep.equal({loc:'cache'});

          // idea associated
          inner._idea[i] = idea;
          inner.deleteData(i);
          expect(resolve()).to.deep.equal({loc:'data'});
        });

        it('matchRef, use inner data', function() {
          idea.update({loc:'data'});
          inner.setData(i, {loc:'cache'});
          inner.setData(im, {loc:'ref cache'});
          var resolve = function() {
            return subgraph.match.units.resolveMatchData(sgMD, im, inner.getMatch(im));
          };

          // the local cache doesn't mean anything
          // defer to the referenced value
          expect(resolve()).to.deep.equal({loc:'cache'});

          // use the local idea
          inner.deleteData(im);
          inner._idea[im] = idea;
          expect(resolve()).to.deep.equal({loc:'data'});

          // use ref cache
          inner.deleteData(im);
          inner.deleteIdea(im);
          expect(resolve()).to.deep.equal({loc:'cache'});

          // use ref idea
          inner.deleteData(i);
          inner._idea[i] = idea;
          expect(resolve()).to.deep.equal({loc:'data'});
        });

        // this can't happen in our algorithm; does it need to be supported?
        //it('!matchRef, use outer data', function() {
        //  outer.setData(o, {loc:'cache'});
        //  var resolve = function() {
        //    var vertexMap = {};
        //    vertexMap[i] = o;
        //    return subgraph.match.units.resolveMatchData(sgMD, i, inner.getMatch(i));
        //  };
        //
        //  expect(resolve()).to.deep.equal({loc:'cache'});
        //});

        it('matchRef, use outer data', function() {
          // im -> i -> o
          idea.update({loc:'data'});
          outer.setData(o, {loc:'cache'});
          outer._idea[o] = idea;
          var resolve = function() {
            sgMD.vertexMap[i] = o;
            return subgraph.match.units.resolveMatchData(sgMD, im, inner.getMatch(im));
          };

          // use the cached data
          expect(resolve()).to.deep.equal({loc:'cache'});

          // use the idea data
          outer.deleteData(o);
          expect(resolve()).to.deep.equal({loc:'data'});
        });

        it('no match', function() {
          var resolve = function() {
            return subgraph.match.units.resolveMatchData(sgMD, im, inner.getMatch(im));
          };

          expect(resolve()).to.deep.equal(null);
        });
      }); // end resolveMatchData

      describe('vertexTransitionableAcceptable', function() {
        // alias just to make this name call shorter
        var acceptable = subgraph.match.units.vertexTransitionableAcceptable;

        it('inner not transitionable', function() {
          // if the inner is not transitionable, then nothing else matters
          // the result will always be true
          var answer = true;

          expect(acceptable(true, {}, false, {})).to.equal(answer);
          expect(acceptable(false, {}, false, {})).to.equal(answer);
          expect(acceptable(undefined, undefined, false, undefined)).to.equal(answer);
          expect(acceptable(null, null, false, null)).to.equal(answer);
        });

        it('outer not transitionable', function() {
          // assumption: inner is transitionable
          // if the outer is not transitionable, then nothing else matters
          // the result will always be false
          var answer = false;

          expect(acceptable(false, {}, true, {})).to.equal(answer);
          expect(acceptable(false, undefined, true, undefined)).to.equal(answer);
          expect(acceptable(false, null, true, null)).to.equal(answer);
        });

        it('no units', function() {
          // assumption: inner is transitionable
          // assumption: outer is transitionable
          // if either of the data objects doesn't have units, then we will assume our transition is allowed
          var answer = true;

          expect(acceptable(true, undefined, true, undefined)).to.equal(answer);
          expect(acceptable(true, {}, true, {})).to.equal(answer);
          expect(acceptable(true, {unit: 'a'}, true, {})).to.equal(answer);
          expect(acceptable(true, {}, true, {unit: 'b'})).to.equal(answer);
        });
        it.skip('factor transition type into this decision');

        it('unit mismatch', function() {
          // assumption: inner is transitionable
          // assumption: outer is transitionable
          // if both have units, and the units don't match, then it's not transitionable
          expect(acceptable(true, {unit: 'a'}, true, {unit: 'b'}, true)).to.equal(false);
          expect(acceptable(true, {unit: 'a'}, true, {unit: 'b'}, false)).to.equal(false);
          expect(acceptable(true, {value:number.value(0),unit:'a'}, true, {value:number.value(0),unit:'b'}, true)).to.equal(false);
          expect(acceptable(true, {value:number.value(0),unit:'a'}, true, {value:number.value(0),unit:'b'}, false)).to.equal(false);
        });

        it('unitOnly / must be transitionable values', function() {
          // assumption: inner is transitionable
          // assumption: outer is transitionable
          var bool = discrete.definitions.list.boolean;

          // if the units match, then the data must still be a number or discrete
          expect(acceptable(true, {unit: 'a'}, true, {unit: 'a'}, true)).to.equal(false);

          expect(acceptable(true, {value:number.value(0),unit:'a'}, true, {value:number.value(1),unit:'a'}, true)).to.equal(true);
          expect(acceptable(true, {value:false,unit:bool}, true, {value:true,unit:bool}, true)).to.equal(true);
        });

        it('!unitOnly', function() {
          // assumption: inner is transitionable
          // assumption: outer is transitionable
          // right now, the only things that can perform transitions are numbers and discrete
          var bool = discrete.definitions.list.boolean;

          // if the data isn't one of those, then it won't transition
          expect(acceptable(true, {unit: 'a'}, true, {unit: 'a'})).to.equal(false);

          expect(acceptable(true, {value:true,unit:bool}, true, {value:true,unit:bool})).to.equal(true);
          expect(acceptable(true, {value:number.value(0),unit:'a'}, true, {value:number.value(0),unit:'a'})).to.equal(true);
          expect(acceptable(true, {value:number.value(0, 2),unit:'a'}, true, {value:number.value(1, 3),unit:'a'})).to.equal(true);
        });
      }); // end vertexTransitionableAcceptable

      describe('vertexFixedMatch', function() {
        // we don't need to test all the matchers
        // but there are distinctly two categories we want to ensure work
        it.skip('against matcher.id');

        it.skip('against data');

        it.skip('pass-through', function() {
          // unitOnly && transitionable
        });
      }); // end vertexNonTransitionableMatch
    }); // end units
  }); // end match (part 2)
}); // end subgraph