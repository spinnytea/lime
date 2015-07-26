'use strict';
var _ = require('lodash');
var expect = require('chai').expect;
var discrete = require('../../src/planning/primitives/discrete');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var subgraph = require('../../src/database/subgraph');

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
  require('./ideas').mock();

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(subgraph)).to.deep.equal(['Subgraph', 'matcher', 'stringify', 'parse', 'search', 'match', 'rewrite', 'createGoal', 'createGoal2', 'solidifyGoal']);
    expect(Object.keys(subgraph.Subgraph.prototype)).to.deep.equal(['copy', 'addVertex', 'addEdge', 'getMatch', 'getIdea', 'allIdeas', 'deleteIdea', 'getData', 'setData', 'deleteData']);
    expect(Object.keys(subgraph.matcher)).to.deep.equal(['id', 'filler', 'exact', 'similar', 'number', 'discrete']);
  });

  describe('Subgraph', function() {
    describe('addVertex', function() {
      it('default options', function() {
        var defaultOptions = {transitionable:false,matchRef:false};
        var sg = new subgraph.Subgraph();

        var v = sg.addVertex(subgraph.matcher.filler);
        expect(sg.getMatch(v).options).to.deep.equal(defaultOptions);

        v = sg.addVertex(subgraph.matcher.filler, undefined, {});
        expect(sg.getMatch(v).options).to.deep.equal(defaultOptions);
      });

      it('invalid matcher', function() {
        var errorStr = 'invalid matcher';
        var sg = new subgraph.Subgraph();

        expect(function() { sg.addVertex(); }).to.throw(errorStr);
        expect(function() { sg.addVertex(1); }).to.throw(errorStr);
        expect(function() { sg.addVertex('text'); }).to.throw(errorStr);
        expect(function() { sg.addVertex('number'); }).to.throw(errorStr);

        expect(function() { sg.addVertex(subgraph.matcher.filler); }).to.not.throw();
      });

      it('matchRef target not defined', function() {
        var errorStr = 'matchRef target (match.data) must already be a vertex';
        var sg = new subgraph.Subgraph();

        expect(function() {
          sg.addVertex(subgraph.matcher.id, 'not in sg', {matchRef:true});
        }).to.throw(errorStr);
      });

      it('matcher.id', function() {
        var idea = ideas.create();

        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, idea.id);

        expect(_.size(sg._match)).to.equal(1);
        expect(_.size(sg._idea)).to.equal(1);
        expect(sg._match[a]).to.not.equal(undefined);
        expect(sg._idea[a]).to.not.equal(undefined);
        expect(sg._idea[a].id).to.equal(idea.id);
        expect(sg._match[a].matcher).to.equal(subgraph.matcher.id);
        expect(sg.concrete).to.equal(true);

        var b = sg.addVertex(subgraph.matcher.id, idea);
        expect(a).to.not.equal(b);
        expect(_.size(sg._match)).to.equal(2);
      });

      it('matcher.number', function() {
        var unit = ideas.create();
        var errorStr = 'matcher.number using non-number';
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);

        expect(function() {
          // if the number data is valid, then it shouldn't error
          sg.addVertex(subgraph.matcher.number, number.cast({value:number.value(0),unit:unit.id}));
        }).to.not.throw();

        expect(function() {
          sg.addVertex(subgraph.matcher.number);
        }).to.throw(errorStr);
        expect(function() {
          sg.addVertex(subgraph.matcher.number, {});
        }).to.throw(errorStr);

        expect(function() {
          // can't check matchRef targets, so it's fine
          sg.addVertex(subgraph.matcher.number, v, {matchRef:true});
        }).to.not.throw();
      });

      it('matcher.discrete', function() {
        var errorStr = 'matcher.discrete using non-discrete';
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);

        ideas.proxy(discrete.definitions.list.boolean).data();

        expect(function() {
          // if the discrete data is valid, then it shouldn't error
          sg.addVertex(subgraph.matcher.discrete, discrete.cast({value: true, unit: discrete.definitions.list.boolean }));
        }).to.not.throw();

        expect(function() {
          sg.addVertex(subgraph.matcher.discrete);
        }).to.throw(errorStr);
        expect(function() {
          sg.addVertex(subgraph.matcher.discrete, {});
        }).to.throw(errorStr);

        expect(function() {
          sg.addVertex(subgraph.matcher.discrete, v, {matchRef:true});
        }).to.not.throw();
      });
    }); // end addVertex

    describe('addEdge', function() {
      it('two filler', function() {
        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.filler);
        var b = sg.addVertex(subgraph.matcher.filler);

        sg.addEdge(a, links.list.thought_description, b);

        expect(sg._edges.length).to.equal(1);
        var edge = sg._edges[0];
        expect(edge.src).to.equal(a);
        expect(edge.link).to.equal(links.list.thought_description);
        expect(edge.dst).to.equal(b);
        expect(edge.pref).to.equal(0);

        sg.addEdge(a, links.list.thought_description, b, 100);
        expect(sg._edges.length).to.equal(2);
        expect(sg._edges[1].pref).to.equal(100);
      });

      it('id/filler', function() {
        var ideaA = ideas.create();

        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, ideaA);
        var b = sg.addVertex(subgraph.matcher.filler);

        sg.addEdge(a, links.list.thought_description, b, 3);

        expect(sg._edges.length).to.equal(1);
        var edge = sg._edges[0];
        expect(edge.src).to.equal(a);
        expect(edge.link).to.equal(links.list.thought_description);
        expect(edge.dst).to.equal(b);
        expect(edge.pref).to.equal(3);

        sg.addEdge(a, links.list.thought_description, b, 100);
        expect(sg._edges.length).to.equal(2);
        expect(sg._edges[1].pref).to.equal(100);
      });

      it('two id match', function() {
        var ideaA = ideas.create();
        var ideaB = ideas.create();
        ideaA.link(links.list.thought_description, ideaB);

        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, ideaA);
        var b = sg.addVertex(subgraph.matcher.id, ideaB);

        sg.addEdge(a, links.list.thought_description, b);

        expect(sg._edges.length).to.equal(1);
        var edge = sg._edges[0];
        expect(edge.src).to.equal(a);
        expect(edge.link).to.equal(links.list.thought_description);
        expect(edge.dst).to.equal(b);
        expect(edge.pref).to.equal(0);

        expect(sg.concrete).to.equal(true);
        expect(sg.getIdea(a).id).to.equal(ideaA.id);
        expect(sg.getIdea(b).id).to.equal(ideaB.id);
      });

      it('two id mis-match', function() {
        var ideaA = ideas.create();
        var ideaB = ideas.create();

        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, ideaA);
        var b = sg.addVertex(subgraph.matcher.id, ideaB);

        sg.addEdge(a, links.list.thought_description, b);

        expect(sg._edges.length).to.equal(1);
        var edge = sg._edges[0];
        expect(edge.src).to.equal(a);
        expect(edge.link).to.equal(links.list.thought_description);
        expect(edge.dst).to.equal(b);
        expect(edge.pref).to.equal(0);

        expect(sg.concrete).to.equal(false);
        expect(sg.getIdea(a)).to.equal(undefined);
        expect(sg.getIdea(b)).to.equal(undefined);
      });
    }); // end addEdge

    describe('copy', function() {
      it('init', function() {
        // this is mutable, this is just for tracking the unit tests
        expect(Object.keys(new subgraph.Subgraph()))
          .to.deep.equal(['_match', '_matchParent', '_idea', '_data', '_dataParent', '_edges', '_vertexCount', 'concrete']);
      });

      it('<split this test apart>', function() {
        var idea = ideas.create();

        // empty
        var sg = new subgraph.Subgraph();
        var sg_x = sg.copy();
        var sg_y = sg.copy();
        expect(sg_x).to.deep.equal(sg);
        expect(sg_y).to.deep.equal(sg);
        expect(sg_x._dataParent).to.equal(sg._dataParent); // they share a common parent
        expect(sg_y._dataParent).to.equal(sg._dataParent);
        expect(sg_x._data).to.not.equal(sg._data); // they do not share a common child data
        expect(sg_y._data).to.not.equal(sg._data);

        var a = sg.addVertex(subgraph.matcher.filler);
        expect(sg.copy()).to.deep.equal(sg);

        var b = sg.addVertex(subgraph.matcher.id, idea.id);
        expect(sg.copy()).to.deep.equal(sg);

        sg.addEdge(a, links.list.thought_description, b);
        expect(sg.copy()).to.deep.equal(sg);

        sg.setData(a, { some: 'thing' });
        expect(sg.copy()).to.deep.equal(sg);
      });

      it.skip('Subgraph._match');

      it.skip('Subgraph._idea');

      it.skip('Subgraph._data');

      it.skip('Subgraph._edges');

      it.skip('Subgraph._vertexCount');

      it.skip('Subgraph.concrete');

      it.skip('flatten', function() {
        // a function that takes the nested nature of the copy/subcopies and flattens a subgraph into it's own unparented copy
        // has the same effect as subgraph.parse(subgraph.flatten(sg)), but is more effecient than that
        // --
        // brainstorm: is this necessary? what does it buy us?
        // - pro: shorter _xxxParent linked lists
        // - con: _data sort of manages itself when necessary (set a local copy; clip parent)
        // - con: the parents aren't very deep in practice [citation needed]
      });

      it.skip('of _idea', function() {
        // is this even worth it?
        // the only time this matters is during searching, and then it's just a LONG list of single matches
        // which then requires flattening
      });
    }); // end copy

    describe('getMatch', function() {
      it('in root', function() {
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);

        expect(sg._matchParent).to.equal(undefined);
        expect(v in sg._match).to.equal(true);

        expect(sg.getMatch(v)).to.not.equal(undefined);
      });

      it('no parent miss (special case)', function() {
        var sg = new subgraph.Subgraph();
        var v = 'not a vertex id';

        expect(sg._matchParent).to.equal(undefined);
        expect(v in sg._match).to.equal(false);

        expect(sg.getMatch(v)).to.equal(undefined);
      });

      it('single parent (special case)', function() {
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);

        expect(sg._matchParent).to.not.equal(undefined);
        expect(sg._matchParent.parent).to.equal(undefined);
        expect(v in sg._match).to.equal(false);
        expect(v in sg._matchParent.obj).to.equal(true);

        expect(sg.getMatch(v)).to.not.equal(undefined);
      });

      it('two parents', function() {
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);

        expect(sg._matchParent).to.not.equal(undefined);
        expect(sg._matchParent.parent).to.not.equal(undefined);
        expect(sg._matchParent.parent.parent).to.equal(undefined);

        expect(sg.getMatch(v)).to.not.equal(undefined);
      });

      it('three parents', function() {
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);

        expect(sg._matchParent).to.not.equal(undefined);
        expect(sg._matchParent.parent).to.not.equal(undefined);
        expect(sg._matchParent.parent.parent).to.not.equal(undefined);
        expect(sg._matchParent.parent.parent.parent).to.equal(undefined);

        expect(sg.getMatch(v)).to.not.equal(undefined);
      });

      it('non-vertex with parents', function() {
        var sg = new subgraph.Subgraph();
        var v = 'not a vertex id';
        sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);
        sg = sg.copy();
        sg.addVertex(subgraph.matcher.filler);

        expect(sg._matchParent).to.not.equal(undefined);
        expect(sg._matchParent.parent).to.not.equal(undefined);
        expect(sg._matchParent.parent.parent).to.equal(undefined);

        expect(sg.getMatch(v)).to.equal(undefined);
      });
    }); // end getMatch

    it('getIdea', function() {
      var idea = ideas.create();
      var sg = new subgraph.Subgraph();
      var v = sg.addVertex(subgraph.matcher.id, idea);

      expect(sg.getIdea(v).id).to.equal(idea.id);
    });

    it('allIdeas', function() {
      var ideaA = ideas.create();
      var ideaB = ideas.create();
      var ideaC = ideas.create();
      var sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.id, ideaA);

      expect(_.pluck(sg.allIdeas(), 'id')).to.deep.equal([ideaA.id]);

      sg = sg.copy();
      sg.addVertex(subgraph.matcher.id, ideaB);
      sg.addVertex(subgraph.matcher.id, ideaC);

      expect(_.pluck(sg.allIdeas(), 'id')).to.deep.equal([ideaA.id, ideaB.id, ideaC.id]);
    });

    it('deleteIdea', function() {
      var idea = ideas.create();
      var sg = new subgraph.Subgraph();
      var v = sg.addVertex(subgraph.matcher.id, idea);

      expect(sg.getIdea(v).id).to.equal(idea.id);
      expect(sg.concrete).to.equal(true);

      sg.deleteIdea(v);

      expect(sg.getIdea(v)).to.equal(undefined);
      expect(sg.concrete).to.equal(false);

      sg.deleteIdea(v);

      // no change from deleting again
      expect(sg.getIdea(v)).to.equal(undefined);
      expect(sg.concrete).to.equal(false);
    });

    describe('getData', function() {
      it('with data', function() {
        var data = { somat: 42 };
        var idea = ideas.create(data);
        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, idea.id);

        // before we load data
        expect(sg._data[a]).to.equal(undefined);

        // the data is loaded
        expect(sg.getData(a)).to.deep.equal(data);

        // after we load data
        expect(sg._data[a]).to.deep.equal(data);

        // check the cached condition
        expect(sg.getData(a)).to.deep.equal(data);
      });

      it('without data', function() {
        var idea = ideas.create();
        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.id, idea.id);

        // before we load data
        expect(sg._data[a]).to.equal(undefined);

        // the data is loaded
        expect(sg.getData(a)).to.equal(undefined);

        // after we load data
        expect(sg._data[a]).to.equal(null);

        // check the cached condition
        expect(sg.getData(a)).to.equal(undefined);
      });

      it('no idea', function() {
        var sg = new subgraph.Subgraph();
        var a = sg.addVertex(subgraph.matcher.filler);

        // before we load data
        expect(sg._data[a]).to.equal(undefined);

        // the data is loaded
        expect(sg.getData(a)).to.equal(undefined);

        // after we load data
        expect(sg._data[a]).to.equal(undefined);
      });

      it.skip('check the call count', function() {
        // do I use chai-spies?
        // do I do a var idea = { id: 'myId', data: function() { /* ... */ } }; ?
      });

      it('in root', function() {
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);
        sg.setData(v, 10);

        expect(sg._dataParent).to.equal(undefined);
        expect(v in sg._data).to.equal(true);

        expect(sg.getData(v)).to.equal(10);
      });

      it('two parents', function() {
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);
        sg.setData(v, 10);
        sg = sg.copy();
        sg.setData(v, 20);
        sg = sg.copy();
        sg.setData(v, 30);

        expect(sg._dataParent).to.not.equal(undefined);
        expect(sg._dataParent.parent).to.not.equal(undefined);
        expect(sg._dataParent.parent.parent).to.equal(undefined);

        expect(sg.getData(v)).to.equal(30);
      });


      it('non-vertex with parents', function() {
        var sg = new subgraph.Subgraph();
        var v = sg.addVertex(subgraph.matcher.filler);
        sg.setData(v, 10);
        sg = sg.copy();
        sg.setData(v, 20);
        sg = sg.copy();
        sg.setData(v, 30);

        expect(sg._dataParent).to.not.equal(undefined);
        expect(sg._dataParent.parent).to.not.equal(undefined);
        expect(sg._dataParent.parent.parent).to.equal(undefined);

        expect(sg.getData('not a vertex id')).to.equal(undefined);
      });
    }); // end getData

    it('setData', function() {
      var sg = new subgraph.Subgraph();
      var a = sg.addVertex(subgraph.matcher.filler);
      var data1 = { some: 'thing' };
      var data2 = { another: 'value' };

      expect(sg.getData(a)).to.equal(undefined);

      sg.setData(a, data1);

      expect(sg.getData(a)).to.deep.equal(data1);

      sg.setData(a, data2);

      expect(sg.getData(a)).to.deep.equal(data2);
    });

    describe('deleteData', function() {
      it('basic', function() {
        var a = ideas.create({a: 1});
        var b = ideas.create({b: 2});
        a.link(links.list.thought_description, b);

        var sg = new subgraph.Subgraph();
        var _a = sg.addVertex(subgraph.matcher.id, a.id);
        var _b = sg.addVertex(subgraph.matcher.id, b.id);
        sg.addEdge(_a, links.list.thought_description, _b);

        function load() {
          expect(sg.getData(_a)).to.deep.equal({a: 1});
          expect(sg.getData(_b)).to.deep.equal({b: 2});
          expect(sg._data[_a]).to.deep.equal({a: 1});
          expect(sg._data[_b]).to.deep.equal({b: 2});
        }

        expect(sg._data[_a]).to.deep.equal(undefined);
        expect(sg._data[_b]).to.deep.equal(undefined);

        load();
        sg.deleteData();
        expect(sg._data[_a]).to.deep.equal(undefined);
        expect(sg._data[_b]).to.deep.equal(undefined);

        load();
        sg.deleteData(_b);
        expect(sg._data[_a]).to.deep.equal({a: 1});
        expect(sg._data[_b]).to.deep.equal(undefined);

        load();
        sg.deleteData(_a);
        expect(sg._data[_a]).to.deep.equal(undefined);
        expect(sg._data[_b]).to.deep.equal({b: 2});

        load();
        sg.deleteData(_b, _a);
        expect(sg._data[_a]).to.deep.equal(undefined);
        expect(sg._data[_b]).to.deep.equal(undefined);
      });

      it.skip('parentage', function() {
        // create parent with data + 2 children with data (overlapping and non)
        // delete data in one
        // data should be gone from that one but still available in the other
      });
    }); // end deleteData
  }); // end Subgraph

  describe('matcher', function() {
    it('id: function', function() {
      var idea = ideas.create();

      expect(subgraph.matcher.id(idea, idea.id)).to.equal(true);
      expect(subgraph.matcher.id(idea, '')).to.equal(false);
      expect(subgraph.matcher.id(idea, undefined)).to.equal(false);
    });

    // matcher.id shouldn't ever actually be used in subgraph.search
    // it doesn't even really make sense in the context of matchRef (since it doesn't use data)
    it('id: basic search', function() {
      var mark = ideas.create();
      var apple = ideas.create();
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.id, apple.id);
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);
    });

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

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);
    });

    it('exact: function', function() {
      var data = { 'thing': 3.14 };

      expect(subgraph.matcher.exact(data, {'thing': 3.14})).to.equal(true);
      expect(subgraph.matcher.exact(data, {'thing': 6.28})).to.equal(false);
      expect(subgraph.matcher.exact(data, {})).to.equal(false);
    });

    it('exact: basic search', function() {
      var mark = ideas.create();
      var apple = ideas.create({'thing': 3.14});
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.exact, {'thing': 3.14});
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.exact, {'thing': 2.71});
      sg.addEdge(m, links.list.thought_description, a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });

    it('similar: function', function() {
      var data = { 'thing1': 3.14, 'thing2': 2.71 };
      var before = _.cloneDeep(data);

      expect(subgraph.matcher.similar(data, {'thing1': 3.14})).to.equal(true);
      expect(subgraph.matcher.similar(data, {'thing2': 2.71})).to.equal(true);
      expect(subgraph.matcher.similar(data, {})).to.equal(true);
      expect(subgraph.matcher.similar(data)).to.equal(true);
      expect(subgraph.matcher.similar(data, {'thing2': 42})).to.equal(false);
      expect(subgraph.matcher.similar(data, {'others': 42})).to.equal(false);

      // the data shouldn't have been changed after any of this
      expect(data).to.deep.equal(before);
    });

    it('similar: basic search', function() {
      var mark = ideas.create();
      var apple = ideas.create({'thing1': 3.14, 'thing2': 2.71});
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.similar, {'thing1': 3.14});
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.similar, {'asdfasdfasdf': 1234});
      sg.addEdge(m, links.list.thought_description, a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });

    it('number: function', function() {
      var unit = ideas.create();
      var data = number.cast({ value: number.value(10), unit: unit.id });

      expect(subgraph.matcher.number(data, { value: number.value(10), unit: unit.id })).to.equal(true);
      expect(subgraph.matcher.number(data, { value: number.value(0, 100), unit: unit.id })).to.equal(true);

      expect(subgraph.matcher.number(data, { value: number.value(10), unit: '_'+unit.id })).to.equal(false);
      expect(subgraph.matcher.number(data, { value: number.value(10) })).to.equal(false);
      expect(subgraph.matcher.number(data, { unit: unit.id })).to.equal(false);
      expect(subgraph.matcher.number(data)).to.equal(false);
    });

    it('number: basic search', function() {
      var unit = ideas.create();
      var mark = ideas.create();
      var apple = ideas.create({ value: number.value(2), unit: unit.id });
      mark.link(links.list.thought_description, apple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: unit.id });
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.number, { value: number.value(0), unit: unit.id });
      sg.addEdge(m, links.list.thought_description, a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });

    it('discrete: function', function() {
      var data = discrete.cast({value: true, unit: discrete.definitions.list.boolean });

      expect(subgraph.matcher.discrete(data, {value: true, unit: discrete.definitions.list.boolean })).to.equal(true);
      expect(subgraph.matcher.discrete(data, {value: false, unit: discrete.definitions.list.boolean })).to.equal(false);

      expect(subgraph.matcher.discrete(data, { value: true, unit: 'not an id' })).to.equal(false);
      expect(subgraph.matcher.discrete(data, { value: true })).to.equal(false);
      expect(subgraph.matcher.discrete(data, { unit: discrete.definitions.list.boolean })).to.equal(false);
      expect(subgraph.matcher.discrete(data)).to.equal(false);
    });

    it('discrete: basic search', function() {
      var unit = discrete.definitions.list.boolean;
      var mark = ideas.create();
      var hasApple = ideas.create({ value: false, unit: discrete.definitions.list.boolean });
      mark.link(links.list.thought_description, hasApple);

      var sg = new subgraph.Subgraph();
      var m = sg.addVertex(subgraph.matcher.id, mark.id);
      var a = sg.addVertex(subgraph.matcher.discrete, { value: false, unit: unit });
      sg.addEdge(m, links.list.thought_description, a);

      var result = subgraph.search(sg);
      expect(result.length).to.equal(1);
      expect(sg).to.equal(result[0]);

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(hasApple.id);

      // fail
      sg = new subgraph.Subgraph();
      m = sg.addVertex(subgraph.matcher.id, mark.id);
      a = sg.addVertex(subgraph.matcher.discrete, { value: true, unit: unit });
      sg.addEdge(m, links.list.thought_description, a);

      result = subgraph.search(sg);
      expect(result.length).to.equal(0);
    });
  }); // end matchers

  it('stringify & parse', function() {
    var unit = ideas.create();
    var num = ideas.create({ value: number.value(2), unit: unit.id });
    var crt = ideas.create({ value: true, unit: discrete.definitions.list.boolean });
    var mark = ideas.create();
    mark.link(links.list.thought_description, num);
    mark.link(links.list.thought_description, crt);

    var sg = new subgraph.Subgraph();
    var m = sg.addVertex(subgraph.matcher.id, mark.id);
    var c = sg.addVertex(subgraph.matcher.discrete, { value: true, unit: discrete.definitions.list.boolean }, {transitionable:true});
    var mc = sg.addVertex(subgraph.matcher.discrete, c, {matchRef:true});
    var n = sg.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: unit.id }, {transitionable:true});
    var mn = sg.addVertex(subgraph.matcher.number, n, {matchRef:true});
    sg.addEdge(m, links.list.thought_description, n, 1);
    sg.addEdge(m, links.list.thought_description, c, 1);
    sg.addEdge(m, links.list.thought_description, mc, 1);
    sg.addEdge(m, links.list.thought_description, mn, 1);

    var str = subgraph.stringify(sg);
    expect(str).to.be.a('string');

    var parsed = subgraph.parse(str);

    // there was some issue getting the vertices in and out
    // so let's keep this test to see if this is a problem
    expect(parsed._match).to.deep.equal(sg._match);
    expect(parsed._idea).to.deep.equal(sg._idea);
    expect(parsed._data).to.deep.equal(sg._data);
    // edges are not as complicated
    // they probably won't ever be an issue
    expect(parsed._edges).to.deep.equal(sg._edges);
    expect(parsed).to.deep.equal(sg);

    expect(parsed.concrete).to.equal(false);
    expect(subgraph.search(parsed)).to.deep.equal([parsed]);
    expect(parsed.concrete).to.equal(true);
    expect(parsed.getIdea(m).id).to.equal(mark.id);
    expect(parsed.getIdea(c).id).to.equal(crt.id);
    expect(parsed.getIdea(mc).id).to.equal(crt.id);
    expect(parsed.getIdea(n).id).to.equal(num.id);
    expect(parsed.getIdea(mn).id).to.equal(num.id);
    expect(parsed.getMatch(mc).data).to.equal(c);
    expect(parsed.getMatch(mn).data).to.equal(n);

    // we can copy this for other tests
    // (usually during debugging or something)
    expect(subgraph.parse(subgraph.stringify(sg))).to.deep.equal(sg);
  });

  it('stringify & parse with parents', function() {
    var sg = new subgraph.Subgraph();
    var a = sg.addVertex(subgraph.matcher.filler);
    var b = sg.addVertex(subgraph.matcher.filler);
    sg.addEdge(a, links.list.thought_description, b);
    sg.setData(a, 10);
    var copy = sg.copy();
    copy.setData(b, 20);

    expect(copy.getData(b)).to.equal(20);
    expect(sg.getData(b)).to.equal(undefined);

    var str = subgraph.stringify(copy);
    expect(str).to.be.a('string');

    var parsed = subgraph.parse(str);

    expect(Object.keys(parsed._match)).to.deep.equal([a, b]);
    expect(parsed._matchParent).to.equal(undefined);
    expect(Object.keys(parsed._data)).to.deep.equal([a, b]);
    expect(_.values(parsed._data)).to.deep.equal([10, 20]);
    expect(parsed._dataParent).to.equal(undefined);
  });

  it('stringify for dump (+ with parents)', function() {
    var aunit = ideas.create();
    var bunit = ideas.create();
    var mark = ideas.create();
    var apple = ideas.create({ value: number.value(2), unit: aunit.id });
    mark.link(links.list.thought_description, apple);
    var banana = ideas.create({ value: number.value(4), unit: bunit.id });
    mark.link(links.list.thought_description, banana);
    var sg = new subgraph.Subgraph();
    var m = sg.addVertex(subgraph.matcher.id, mark.id);
    var a = sg.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: aunit.id }, {transitionable:true});
    sg.addEdge(m, links.list.thought_description, a, 1);

    var expected = {};

    // before search, this is inconcrete, so there is no data to back it
    expected[m] = null;
    expect(
      JSON.parse(subgraph.stringify(sg, true)).data
    ).to.deep.equal(expected);

    expect(subgraph.search(sg)).to.deep.equal([sg]);

    // after search, there is underlying data
    expected[a] = apple.data();
    expect(
      JSON.parse(subgraph.stringify(sg, true)).data
    ).to.deep.equal(expected);

    // use the cached data
    expected[a] = { value: number.value(1), unit: aunit.id };
    sg.setData(a, expected[a]);
    expect(
      JSON.parse(subgraph.stringify(sg, true)).data
    ).to.deep.equal(expected);

    //
    // + with parents
    //

    sg = sg.copy();
    var b = sg.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: bunit.id }, {transitionable:true});
    sg.addEdge(m, links.list.thought_description, b);

    // just to make sure we are using parents
    expect(sg._dataParent.obj[a]).to.equal(expected[a]);

    expect(
      JSON.parse(subgraph.stringify(sg, true)).data
    ).to.deep.equal(expected);

    expect(subgraph.search(sg)).to.deep.equal([sg]);

    // after search, there is underlying data
    expected[b] = banana.data();
    expect(
      JSON.parse(subgraph.stringify(sg, true)).data
    ).to.deep.equal(expected);

    // use the cached data
    expected[b] = { value: number.value(200), unit: bunit.id };
    sg.setData(b, expected[b]);
    expect(
      JSON.parse(subgraph.stringify(sg, true)).data
    ).to.deep.equal(expected);
  });

  it('createGoal', function() {
    var a = ideas.create('a');
    var b = ideas.create('b');
    var c = ideas.create('c');
    a.link(links.list.thought_description, b);
    b.link(links.list.thought_description, c);

    var outer = new subgraph.Subgraph();
    var oa = outer.addVertex(subgraph.matcher.id, a);
    var ob = outer.addVertex(subgraph.matcher.id, b);
    var oc = outer.addVertex(subgraph.matcher.id, c);
    outer.addEdge(oa, links.list.thought_description, ob);
    outer.addEdge(ob, links.list.thought_description, oc);

    var inner = new subgraph.Subgraph();
    var ib = inner.addVertex(subgraph.matcher.exact, 'b');
    var ic = inner.addVertex(subgraph.matcher.exact, 'c');
    inner.addEdge(ib, links.list.thought_description, ic);

    var vertexMap = subgraph.match(outer, inner);
    expect(vertexMap.length).to.equal(1);
    checkSubgraphMatch(vertexMap, [ob, oc], [ib, ic]);

    expect(inner._data).to.deep.equal({});
    expect(inner._dataParent).to.equal(undefined);

    var goal = subgraph.createGoal(outer, inner, vertexMap[0]);

    expect(inner._data).to.deep.equal({});
    expect(inner._dataParent).to.equal(undefined);
    expect(_.keys(goal._data)).to.deep.equal([ib, ic]);
    expect(_.values(goal._data)).to.deep.equal(['b', 'c']);
    expect(goal._dataParent).to.equal(undefined);
    expect(goal.getIdea(ib).id).to.equal(b.id);
    expect(goal.getIdea(ic).id).to.equal(c.id);
  });

  it.skip('createGoal2');

  it('solidifyGoal', function() {
    // root points to a,b,c
    var r = ideas.create('r');
    var a = ideas.create('a');
    var b = ideas.create('b');
    var c = ideas.create();
    r.link(links.list.thought_description, a);
    r.link(links.list.thought_description, b);
    r.link(links.list.thought_description, c);

    var state = new subgraph.Subgraph();
    var sr = state.addVertex(subgraph.matcher.id, r);
    var sa = state.addVertex(subgraph.matcher.id, a);
    var sb = state.addVertex(subgraph.matcher.id, b);
    var sc = state.addVertex(subgraph.matcher.id, c);
    state.addEdge(sr, links.list.thought_description, sa);
    state.addEdge(sr, links.list.thought_description, sb);
    state.addEdge(sr, links.list.thought_description, sc);
    state.setData(sa, 'cache a');

    expect(subgraph.search(state)).to.deep.equal([state]);
    expect(state.concrete).to.equal(true);

    var goal = new subgraph.Subgraph();
    var gr = goal.addVertex(subgraph.matcher.id, r);
    var gs = goal.addVertex(subgraph.matcher.filler);
    goal.addEdge(gr, links.list.thought_description, gs);

    var result = subgraph.solidifyGoal(state, goal);

    expect(result.length).to.equal(3);
    expect(result.map(function(r) { return r.constructor.name; })).to.deep.equal(['Subgraph', 'Subgraph', 'Subgraph']);
    expect(result.map(function(r) { return r.concrete; })).to.deep.equal([true, true, true]);


    // I think the only guarantee to this match order is the fact that the algorithm loops through the outer links in order

    var zer = result[0];
    expect(zer.getIdea(gs).id).to.equal(a.id);
    expect(zer.getData(gs)).to.equal('cache a');

    var one = result[1];
    expect(one.getIdea(gs).id).to.equal(b.id);
    expect(one.getData(gs)).to.equal('b');

    var two = result[2];
    expect(two.getIdea(gs).id).to.equal(c.id);
    expect(two.getData(gs)).to.equal(undefined);
  });

  describe('units', function() {
    it('init', function() {
      // this is to ensure we test everything
      expect(Object.keys(subgraph.units)).to.deep.equal(['convertInnerTransitions']);
    });

    it.skip('convertInnerTransitions');
  }); // end units
}); // end subgraph
