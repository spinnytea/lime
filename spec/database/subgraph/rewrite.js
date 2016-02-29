'use strict';
var expect = require('chai').expect;
var discrete = require('../../../src/planning/primitives/discrete');
var ideas = require('../../../src/database/ideas');
var links = require('../../../src/database/links');
var number = require('../../../src/planning/primitives/number');
var subgraph = require('../../../src/database/subgraph');

describe('subgraph', function() {
  describe('rewrite', function() {
    require('../ideas').mock();

    var indeterminate, money, price, wumpus, any, empty, wumpusUpdateIdea;
    var sg, p, w, a, e, wu, p_w, a_e;
    var priceData, wumpusData, priceUpdate, priceUpdate2, wumpusUpdate, wumpusUpdate2, anyData, anyUpdate;

    beforeEach(function() {
      indeterminate = discrete.definitions.create(['true', 'false', 'maybe']);
      money = ideas.create();

      priceData = { value: number.value(10), unit: money.id };
      price = ideas.create(priceData);
      wumpusData = { value: 'true', unit: indeterminate.id };
      wumpus = ideas.create(wumpusData);
      anyData = { thing: 42 };
      any = ideas.create(anyData);
      empty = ideas.create();
      price.link(links.list.thought_description, wumpus);
      any.link(links.list.thought_description, empty);

      sg = new subgraph.Subgraph();
      p = sg.addVertex(subgraph.matcher.id, price, {transitionable:true});
      w = sg.addVertex(subgraph.matcher.id, wumpus, {transitionable:true});
      a = sg.addVertex(subgraph.matcher.id, any, {transitionable:true});
      e = sg.addVertex(subgraph.matcher.id, empty);
      p_w = sg.addEdge(price, links.list.thought_description, wumpus);
      a_e = sg.addEdge(any, links.list.thought_description, empty, { transitionable: true });

      priceUpdate = { value: number.value(20), unit: money.id };
      priceUpdate2 = { value: number.value(30), unit: money.id };
      wumpusUpdate = { value: 'false', unit: indeterminate.id };
      wumpusUpdate2 = { value: 'maybe', unit: indeterminate.id };
      anyUpdate = { object: 3.14 };

      // replace_id
      wumpusUpdateIdea = ideas.create(wumpusUpdate);
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

    it('validate transitions', function() {
      // no transitions
      expect(subgraph.rewrite(sg, [])).to.equal(undefined);

      // invalid
      expect(subgraph.rewrite(sg, ['!@#$ not an id'])).to.equal(undefined);
      expect(subgraph.rewrite(sg, [0])).to.equal(undefined);

      // vertex not transitionable
      expect(subgraph.rewrite(sg, [{ vertex_id: e, replace_id: 0 }])).to.equal(undefined);

      // no transition types defined
      expect(subgraph.rewrite(sg, [{ vertex_id: 0 }])).to.equal(undefined);

      // no data in vertex to transition
      sg.getMatch(e).options.transitionable = true;
      expect(subgraph.rewrite(sg, [{ vertex_id: e, replace: {thing:1} }])).to.equal(undefined);

      // replace_id with wrong units
      sg.setData(e, {value: 0, unit: 'not an id'});
      expect(subgraph.rewrite(sg, [{ vertex_id: e, replace_id: w }])).to.equal(undefined);
    });

    describe('!actual', function() {
      it('replace number', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: p, replace: priceUpdate }]);
        expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.getData(p)).to.deep.equal(priceData);
        expect(sg2.getData(p)).to.deep.equal(priceUpdate);
        // don't update the idea
        expect(sg.getIdea(p).data()).to.deep.equal(priceData);
        expect(sg2.getIdea(p).data()).to.deep.equal(priceData);

        var sg3 = subgraph.rewrite(sg2, [{vertex_id: p, replace: priceUpdate2 }]);
        expect(sg3).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg3).to.not.equal(sg);
        expect(sg3).to.not.equal(sg2);
        // update the new value
        expect(sg.getData(p)).to.deep.equal(priceData);
        expect(sg2.getData(p)).to.deep.equal(priceUpdate);
        expect(sg3.getData(p)).to.deep.equal(priceUpdate2);
        // don't update the idea
        expect(sg.getIdea(p).data()).to.deep.equal(priceData);
        expect(sg2.getIdea(p).data()).to.deep.equal(priceData);
        expect(sg3.getIdea(p).data()).to.deep.equal(priceData);

        // wumpus Data units don't match
        expect(subgraph.rewrite(sg, [{ vertex_id: p, replace: wumpusUpdate }])).to.equal(undefined);

        // replacing any data should be fine
        var sg4 = subgraph.rewrite(sg3, [{ vertex_id: p, replace: anyUpdate }]);
        expect(sg4).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg4).to.not.equal(sg3);
        // update the new value
        expect(sg3.getData(p)).to.deep.equal(priceUpdate2);
        expect(sg4.getData(p)).to.deep.equal(anyUpdate);
        // don't update the idea
        expect(sg3.getIdea(p).data()).to.deep.equal(priceData);
        expect(sg4.getIdea(p).data()).to.deep.equal(priceData);
      });

      it('replace discrete', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace: wumpusUpdate }]);
        expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.getData(w)).to.deep.equal(wumpusData);
        expect(sg2.getData(w)).to.deep.equal(wumpusUpdate);
        // don't update the idea
        expect(sg.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg2.getIdea(w).data()).to.deep.equal(wumpusData);

        var sg3 = subgraph.rewrite(sg2, [{vertex_id: w, replace: wumpusUpdate2 }]);
        expect(sg3).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg3).to.not.equal(sg);
        expect(sg3).to.not.equal(sg2);
        // update the new value
        expect(sg.getData(w)).to.deep.equal(wumpusData);
        expect(sg2.getData(w)).to.deep.equal(wumpusUpdate);
        expect(sg3.getData(w)).to.deep.equal(wumpusUpdate2);
        // don't update the idea
        expect(sg.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg2.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg3.getIdea(w).data()).to.deep.equal(wumpusData);

        // price Data units don't match
        expect(subgraph.rewrite(sg, [{ vertex_id: w, replace: priceUpdate }])).to.equal(undefined);

        // replacing any data should be fine
        var sg4 = subgraph.rewrite(sg3, [{ vertex_id: w, replace: anyUpdate }]);
        expect(sg4).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg4).to.not.equal(sg3);
        // update the new value
        expect(sg3.getData(w)).to.deep.equal(wumpusUpdate2);
        expect(sg4.getData(w)).to.deep.equal(anyUpdate);
        // don't update the idea
        expect(sg3.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg4.getIdea(w).data()).to.deep.equal(wumpusData);
      });

      it('replace anything', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: a, replace: anyUpdate }]);
        expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.getData(a)).to.deep.equal(anyData);
        expect(sg2.getData(a)).to.deep.equal(anyUpdate);
        // don't update the idea
        expect(sg.getIdea(a).data()).to.deep.equal(anyData);
        expect(sg2.getIdea(a).data()).to.deep.equal(anyData);

        var sg3 = subgraph.rewrite(sg, [{vertex_id: a, replace: priceUpdate }]);
        expect(sg3).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg3).to.not.equal(sg);
        // update the new value
        expect(sg.getData(a)).to.deep.equal(anyData);
        expect(sg3.getData(a)).to.deep.equal(priceUpdate);
        // don't update the id
        expect(sg.getIdea(a).data()).to.deep.equal(anyData);
        expect(sg3.getIdea(a).data()).to.deep.equal(anyData);

        var sg4 = subgraph.rewrite(sg, [{vertex_id: a, replace: wumpusUpdate }]);
        expect(sg4).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg4).to.not.equal(sg);
        // update the new value
        expect(sg.getData(a)).to.deep.equal(anyData);
        expect(sg4.getData(a)).to.deep.equal(wumpusUpdate);
        // don't update the idea
        expect(sg.getIdea(a).data()).to.deep.equal(anyData);
        expect(sg4.getIdea(a).data()).to.deep.equal(anyData);
      });

      it('replace_id', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace_id: wu }]);
        expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.getData(w)).to.deep.equal(wumpusData);
        expect(sg2.getData(w)).to.deep.equal(wumpusUpdate);
        // don't update the idea
        expect(sg.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg2.getIdea(w).data()).to.deep.equal(wumpusData);
      });

      it('cycle discrete', function() {
        // true, false, maybe
        var currValue = {type: 'lime_discrete', unit: indeterminate.id, value: 'false'};

        var sg2 = subgraph.rewrite(sg, [{vertex_id: w, cycle: { unit: indeterminate.id, value: 1 } }]);
        expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.getData(w)).to.deep.equal(wumpusData);
        expect(sg2.getData(w)).to.deep.equal(currValue);
        // don't update the idea
        expect(sg.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg2.getIdea(w).data()).to.deep.equal(wumpusData);

        var sg3 = subgraph.rewrite(sg2, [{vertex_id: w, cycle: { unit: indeterminate.id, value: 2 } }]);
        currValue.value = 'true';
        expect(sg3).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg3).to.not.equal(sg2);
        expect(sg3.getData(w)).to.deep.equal(currValue);

        var sg4 = subgraph.rewrite(sg3, [{vertex_id: w, cycle: { unit: indeterminate.id, value: 3 } }]);
        expect(sg4).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg4).to.not.equal(sg3);
        expect(sg4.getData(w)).to.deep.equal(currValue);

        var sg5 = subgraph.rewrite(sg4, [{vertex_id: w, cycle: { unit: indeterminate.id, value: -4 } }]);
        currValue.value = 'maybe';
        expect(sg5).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg5).to.not.equal(sg4);
        expect(sg5.getData(w)).to.deep.equal(currValue);

        // don't update the idea
        expect(sg.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg2.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg3.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg4.getIdea(w).data()).to.deep.equal(wumpusData);
        expect(sg5.getIdea(w).data()).to.deep.equal(wumpusData);
      });

      it('cycle number', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: p, cycle: { unit: money.id, value: 1 } }]);
        expect(sg2).to.equal(undefined);
      });

      it('combine number', function() {
        var sg2 = subgraph.rewrite(sg, [{vertex_id: p, combine: priceUpdate }]);
        expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg2).to.not.equal(sg);
        // update the new value
        expect(sg.getData(p)).to.deep.equal(priceData);
        expect(sg2.getData(p)).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
        // don't update the idea
        expect(sg.getIdea(p).data()).to.deep.equal(priceData);
        expect(sg2.getIdea(p).data()).to.deep.equal(priceData);

        var sg3 = subgraph.rewrite(sg2, [{vertex_id: p, combine: priceUpdate2 }]);
        expect(sg3).to.be.an.instanceOf(subgraph.Subgraph);
        expect(sg3).to.not.equal(sg);
        expect(sg3).to.not.equal(sg2);
        // update the new value
        expect(sg.getData(p)).to.deep.equal(priceData);
        expect(sg2.getData(p)).to.deep.equal({ type: 'lime_number', value: number.value(30), unit: money.id });
        expect(sg3.getData(p)).to.deep.equal({ type: 'lime_number', value: number.value(60), unit: money.id });
        // don't update the idea
        expect(sg.getIdea(p).data()).to.deep.equal(priceData);
        expect(sg2.getIdea(p).data()).to.deep.equal(priceData);
        expect(sg3.getIdea(p).data()).to.deep.equal(priceData);

        // this should fail for a number of things
        // but we can't combine discrete date or any data
        expect(subgraph.rewrite(sg, [{vertex_id: p, combine: wumpusUpdate }])).to.equal(undefined);
        expect(subgraph.rewrite(sg, [{vertex_id: p, combine: anyUpdate }])).to.equal(undefined);
      });

      it('combine discrete', function() {
        expect(subgraph.rewrite(sg, [{vertex_id: w, combine: wumpusUpdate }])).to.equal(undefined);
        expect(subgraph.rewrite(sg, [{vertex_id: w, combine: priceUpdate }])).to.equal(undefined);
        expect(subgraph.rewrite(sg, [{vertex_id: w, combine: anyUpdate }])).to.equal(undefined);
      });

      it('combine anything', function() {
        expect(subgraph.rewrite(sg, [{vertex_id: a, combine: anyUpdate }])).to.equal(undefined);
        expect(subgraph.rewrite(sg, [{vertex_id: a, combine: priceUpdate }])).to.equal(undefined);
        expect(subgraph.rewrite(sg, [{vertex_id: a, combine: wumpusUpdate }])).to.equal(undefined);
      });
    }); // end !actual

    it('actual', function() {
      // replace number
      var sg2 = subgraph.rewrite(sg, [{vertex_id: p, replace: priceUpdate }], true);
      expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
      expect(sg2).to.equal(sg);
      expect(sg.getData(p)).to.deep.equal(priceUpdate);
      expect(sg.getIdea(p).data()).to.deep.equal(priceUpdate);

      // replace discrete
      sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace: wumpusUpdate2 }], true);
      expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
      expect(sg2).to.equal(sg);
      expect(sg.getData(w)).to.deep.equal(wumpusUpdate2);
      expect(sg.getIdea(w).data()).to.deep.equal(wumpusUpdate2);

      // replace_id
      sg2 = subgraph.rewrite(sg, [{vertex_id: w, replace_id: wu }], true);
      expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
      expect(sg2).to.equal(sg);
      expect(sg.getData(w)).to.deep.equal(wumpusUpdate);
      expect(sg.getIdea(w).data()).to.deep.equal(wumpusUpdate);

      // cycle discrete
      sg2 = subgraph.rewrite(sg, [{vertex_id: w, cycle: { unit: indeterminate.id, value: 1 } }], true);
      expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
      expect(sg2).to.equal(sg);
      expect(sg.getData(w)).to.deep.equal({type: 'lime_discrete', unit: indeterminate.id, value: 'maybe'});
      expect(sg.getIdea(w).data()).to.deep.equal({type: 'lime_discrete', unit: indeterminate.id, value: 'maybe'});

      // cycle number
      sg2 = subgraph.rewrite(sg, [{vertex_id: p, cycle: { unit: money.id, value: 1 } }], true);
      expect(sg2).to.equal(undefined);

      // combine number
      sg2 = subgraph.rewrite(sg, [{vertex_id: p, combine: priceUpdate }], true);
      expect(sg2).to.be.an.instanceOf(subgraph.Subgraph);
      expect(sg2).to.equal(sg);
      // note: our previous update (replace) has taken effect; we are combining priceUpdate twice
      expect(sg.getData(p)).to.deep.equal({ type: 'lime_number', value: number.value(40), unit: money.id });
      expect(sg2.getIdea(p).data()).to.deep.equal({ type: 'lime_number', value: number.value(40), unit: money.id });

      // combine discrete
      sg2 = subgraph.rewrite(sg, [{vertex_id: w, combine: wumpusData }], true);
      expect(sg2).to.equal(undefined);
    });
  }); // end rewrite

  describe('rewrite', function() {
    require('../ideas').mock();

    describe('units', function() {
      it('init', function() {
        // this is to ensure we test everything
        expect(Object.keys(subgraph.rewrite.units)).to.deep.equal(['checkVertex', 'transitionVertex', 'checkEdge', 'transitionEdge']);
      });

      describe('checkVertex', function() {
        it.skip('invalid transition');

        it.skip('vertex does not exist');

        it.skip('not transitionable');

        it.skip('no data to transition');

        it.skip('replace');

        it.skip('replace_id');

        it.skip('cycle');

        it.skip('combine');
      }); // end checkVertex

      it.skip('transitionVertex');

      describe('checkEdge', function() {
        var sg, b, a_b, a_c;
        beforeEach(function() {
          var a_idea = ideas.create();
          var b_idea = ideas.create();
          var c_idea = ideas.create();
          a_idea.link(links.list.thought_description, b_idea);
          a_idea.link(links.list.thought_description, c_idea);

          sg = new subgraph.Subgraph();
          var a = sg.addVertex(subgraph.matcher.id, a_idea);
          b = sg.addVertex(subgraph.matcher.id, b_idea);
          var c = sg.addVertex(subgraph.matcher.id, c_idea);
          a_b = sg.addEdge(a, links.list.thought_description, b);
          a_c = sg.addEdge(a, links.list.thought_description, c, { transitionable: true });
        });

        it('invalid transition', function() {
          expect(sg.getEdge(a_c)).to.not.equal(undefined);
          expect(subgraph.rewrite.units.checkEdge(sg, { edge_id: a_c, not_valid: '' })).to.equal(false);
        });

        it('edge does not exist', function() {
          expect(sg.getEdge('invalid')).to.equal(undefined);
          expect(subgraph.rewrite.units.checkEdge(sg, { edge_id: 'invalid' })).to.equal(false);
        });

        it('not transitionable', function() {
          expect(subgraph.rewrite.units.checkEdge(sg, { edge_id: a_b, replace_src: b })).to.equal(false);
        });

        it('replace_src', function() {
          expect(subgraph.rewrite.units.checkEdge(sg, { edge_id: a_c, replace_src: 'invalid' })).to.equal(false);
          expect(subgraph.rewrite.units.checkEdge(sg, { edge_id: a_c, replace_src: b })).to.equal(true);
        });

        it('replace_dst', function() {
          expect(subgraph.rewrite.units.checkEdge(sg, { edge_id: a_c, replace_dst: 'invalid' })).to.equal(false);
          expect(subgraph.rewrite.units.checkEdge(sg, { edge_id: a_c, replace_dst: b })).to.equal(true);
        });
      }); // end checkEdge

      describe('transitionEdge', function() {
        var sg, a, b, c, e;
        var a_idea, b_idea, c_idea;
        beforeEach(function() {
          a_idea = ideas.create();
          b_idea = ideas.create();
          c_idea = ideas.create();
          a_idea.link(links.list.thought_description, b_idea);

          sg = new subgraph.Subgraph();
          a = sg.addVertex(subgraph.matcher.id, a_idea);
          b = sg.addVertex(subgraph.matcher.id, b_idea);
          c = sg.addVertex(subgraph.matcher.id, c_idea);
          e = sg.addEdge(a, links.list.thought_description, b, { transitionable: true });

          expect(sg.concrete).to.equal(true);
        });

        it('replace_src, not actual', function() {
          expect(a_idea.link(links.list.thought_description)).to.deep.equal([b_idea]);
          expect(c_idea.link(links.list.thought_description)).to.deep.equal([]);

          subgraph.rewrite.units.transitionEdge(sg, { edge_id: e, replace_src: c }, false);

          expect(a_idea.link(links.list.thought_description)).to.deep.equal([b_idea]);
          expect(c_idea.link(links.list.thought_description)).to.deep.equal([]);
          expect(sg.getEdge(e).src).to.equal(c);
          expect(sg.getEdge(e).dst).to.equal(b);
        });

        it('replace_src, actual', function() {
          expect(a_idea.link(links.list.thought_description)).to.deep.equal([b_idea]);
          expect(c_idea.link(links.list.thought_description)).to.deep.equal([]);

          subgraph.rewrite.units.transitionEdge(sg, { edge_id: e, replace_src: c }, true);

          expect(a_idea.link(links.list.thought_description)).to.deep.equal([]);
          expect(c_idea.link(links.list.thought_description)).to.deep.equal([b_idea]);
          expect(sg.getEdge(e).src).to.equal(c);
          expect(sg.getEdge(e).dst).to.equal(b);
        });

        it('replace_dst, not actual', function() {
          expect(a_idea.link(links.list.thought_description)).to.deep.equal([b_idea]);

          subgraph.rewrite.units.transitionEdge(sg, { edge_id: e, replace_dst: c }, false);

          expect(a_idea.link(links.list.thought_description)).to.deep.equal([b_idea]);
          expect(sg.getEdge(e).src).to.equal(a);
          expect(sg.getEdge(e).dst).to.equal(c);
        });

        it('replace_dst, actual', function() {
          expect(a_idea.link(links.list.thought_description)).to.deep.equal([b_idea]);

          subgraph.rewrite.units.transitionEdge(sg, { edge_id: e, replace_dst: c }, true);

          expect(a_idea.link(links.list.thought_description)).to.deep.equal([c_idea]);
          expect(sg.getEdge(e).src).to.equal(a);
          expect(sg.getEdge(e).dst).to.equal(c);
        });
      }); // end transitionEdge
    }); // end units
  }); // end rewrite
}); // end subgraph