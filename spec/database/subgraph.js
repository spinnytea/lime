'use strict';
/* global describe, it, beforeEach, afterEach */
var _ = require('lodash');
var expect = require('chai').expect;
var discrete = require('../../src/planning/primitives/discrete');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var subgraph = require('../../src/database/subgraph');
var tools = require('../testingTools');

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
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(subgraph)).to.deep.equal(['Subgraph', 'matcher', 'stringify', 'parse', 'search', 'match', 'rewrite']);
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
        var idea = tools.ideas.create();

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
        var unit = tools.ideas.create();
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
        var ideaA = tools.ideas.create();

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
        var ideaA = tools.ideas.create();
        var ideaB = tools.ideas.create();
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
        var ideaA = tools.ideas.create();
        var ideaB = tools.ideas.create();

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

    it('copy', function() {
      var idea = tools.ideas.create();

      // empty
      var sg = new subgraph.Subgraph();
      expect(sg.copy()).to.deep.equal(sg);

      var a = sg.addVertex(subgraph.matcher.filler);
      expect(sg.copy()).to.deep.equal(sg);

      var b = sg.addVertex(subgraph.matcher.id, idea.id);
      expect(sg.copy()).to.deep.equal(sg);

      sg.addEdge(a, links.list.thought_description, b);
      expect(sg.copy()).to.deep.equal(sg);

      sg.setData(a, { some: 'thing' });
      expect(sg.copy()).to.deep.equal(sg);
    });

    describe('~~New!~~ lazy copy', function() {
      it.skip('nothing at first');

      it.skip('matchParent');

      it.skip('stringify');

      // ensure getting vertices goes back to most recent version
      // - maybe the one beforeƒ
      // - maybe the original
      it.skip('copy of copy');

      it.skip('search');

      it.skip('flatten');
    }); // end lazy copy

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

      it('two parents', function() {
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
      var idea = tools.ideas.create();
      var sg = new subgraph.Subgraph();
      var v = sg.addVertex(subgraph.matcher.id, idea);

      expect(sg.getIdea(v).id).to.equal(idea.id);
    });

    it('allIdeas', function() {
      var ideaA = tools.ideas.create();
      var ideaB = tools.ideas.create();
      var ideaC = tools.ideas.create();
      var sg = new subgraph.Subgraph();
      sg.addVertex(subgraph.matcher.id, ideaA);

      expect(_.pluck(sg.allIdeas(), 'id')).to.deep.equal([ideaA.id]);

      sg = sg.copy();
      sg.addVertex(subgraph.matcher.id, ideaB);
      sg.addVertex(subgraph.matcher.id, ideaC);

      expect(_.pluck(sg.allIdeas(), 'id')).to.deep.equal([ideaA.id, ideaB.id, ideaC.id]);
    });

    it('deleteIdea', function() {
      var idea = tools.ideas.create();
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
        var idea = tools.ideas.create(data);
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
        var idea = tools.ideas.create();
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

    it('deleteData', function() {
      var a = tools.ideas.create({a: 1});
      var b = tools.ideas.create({b: 2});
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
  }); // end Subgraph

  describe('matcher', function() {
    it('id: function', function() {
      var idea = tools.ideas.create();

      expect(subgraph.matcher.id(idea, idea.id)).to.equal(true);
      expect(subgraph.matcher.id(idea, '')).to.equal(false);
      expect(subgraph.matcher.id(idea, undefined)).to.equal(false);
    });

    // matcher.id shouldn't ever actually be used in subgraph.search
    // it doesn't even really make sense in the context of matchRef (since it doesn't use data)
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

      expect(sg.getIdea(m).id).to.equal(mark.id);
      expect(sg.getIdea(a).id).to.equal(apple.id);
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
      var mark = tools.ideas.create();
      var apple = tools.ideas.create({'thing1': 3.14, 'thing2': 2.71});
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
      var unit = tools.ideas.create();
      var data = number.cast({ value: number.value(10), unit: unit.id });

      expect(subgraph.matcher.number(data, { value: number.value(10), unit: unit.id })).to.equal(true);
      expect(subgraph.matcher.number(data, { value: number.value(0, 100), unit: unit.id })).to.equal(true);

      expect(subgraph.matcher.number(data, { value: number.value(10), unit: '_'+unit.id })).to.equal(false);
      expect(subgraph.matcher.number(data, { value: number.value(10) })).to.equal(false);
      expect(subgraph.matcher.number(data, { unit: unit.id })).to.equal(false);
      expect(subgraph.matcher.number(data)).to.equal(false);
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
      var mark = tools.ideas.create();
      var hasApple = tools.ideas.create({ value: false, unit: discrete.definitions.list.boolean });
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
    var unit = tools.ideas.create();
    var num = tools.ideas.create({ value: number.value(2), unit: unit.id });
    var crt = tools.ideas.create({ value: true, unit: discrete.definitions.list.boolean });
    var mark = tools.ideas.create();
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

  it('stringify for dump', function() {
    var unit = tools.ideas.create();
    var mark = tools.ideas.create();
    var apple = tools.ideas.create({ value: number.value(2), unit: unit.id });
    mark.link(links.list.thought_description, apple);
    var sg = new subgraph.Subgraph();
    var m = sg.addVertex(subgraph.matcher.id, mark.id);
    var a = sg.addVertex(subgraph.matcher.number, { value: number.value(0, Infinity), unit: unit.id }, {transitionable:true});
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
    expected[a] = { value: number.value(1), unit: unit.id };
    sg.setData(a, expected[a]);
    expect(
      JSON.parse(subgraph.stringify(sg, true)).data
    ).to.deep.equal(expected);
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
  }); // end search

  describe('match', function() {
    var context, mark, apple, price;
    var outer, c, m, a, p;
    beforeEach(function() {
      context = tools.ideas.create();
      mark = tools.ideas.create();
      apple = tools.ideas.create();
      var money = tools.ideas.create();
      price = tools.ideas.create({value: number.value(10), unit: money.id});
      context.link(links.list.context, mark);
      mark.link(links.list.thought_description, apple);
      apple.link(links.list.thought_description, price);

      outer = new subgraph.Subgraph();
      c = outer.addVertex(subgraph.matcher.id, context);
      m = outer.addVertex(subgraph.matcher.id, mark);
      a = outer.addVertex(subgraph.matcher.filler);
      p = outer.addVertex(subgraph.matcher.similar, {value: number.value(10)});
      outer.addEdge(c, links.list.context, m);
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

      checkSubgraphMatch(subgraph.match(outer, sg), [m, a, p, b, bp], [_m, _a, _p, _b, _bp]);
    });

    it.skip('multiple outer to same idea', function() {
      // what if there are mulitple vertices in the outer graph that point to the same idea?
    });

    it.skip('multiple inner to same idea', function() {
      // what if there are mulitple vertices in the inner graph that point to the same idea?
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
        var id1 = tools.ideas.create();
        var id2 = tools.ideas.create();
        var id3 = tools.ideas.create();
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
        var unit = tools.ideas.create();
        var v1 = tools.ideas.create({ value: number.value(5), unit: unit.id });
        var v2 = tools.ideas.create({ value: number.value(15), unit: unit.id });
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
          mark = tools.ideas.create({name: 'mark'}); // anchor
          desire = tools.ideas.create({name: 'apple'}); // matchRef
          apple = tools.ideas.create({name: 'apple', target: true}); // target
          var banana = tools.ideas.create({name: 'banana'}); // distractor
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

        // TODO what does it mean to have a concrete inner object with matchRef
        // - how does this even work with a subgraphMatch search
        // - it's easy to say "oh, just match the idea data since we already have it"
        // - but what if the matcher(v.data, vertices[v.matchData].data) is no longer true?
//        it.skip('inner concrete');

        it('inner target w/ data', function() {
          var prep = new subgraph.Subgraph();
          var im = prep.addVertex(subgraph.matcher.id, mark);
          var id = prep.addVertex(subgraph.matcher.id, desire);
          prep.addEdge(im, links.list.thought_description, id);

          var inner;
          var i_ = prep.addVertex(subgraph.matcher.similar, id, {matchRef:true});

          inner = prep.copy();
          inner.addEdge(im, links.list.thought_description, i_, -1);
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(im, links.list.thought_description, i_, +1);
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);

          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, -1);
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, +1);
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
          inner.addEdge(im, links.list.thought_description, i_, -1);
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(im, links.list.thought_description, i_, +1);
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);

          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, -1);
          checkSubgraphMatch(subgraph.match(outer, inner), [om, od, o_], [im, id, i_]);
          inner = prep.copy();
          inner.addEdge(i_, links.list.thought_description.opposite, im, +1);
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
        var a_root = tools.ideas.create();
        var a_crt = tools.ideas.create(discrete.cast({value: true, unit: discrete.definitions.list.boolean}));
        var a_num = tools.ideas.create(number.cast({value: number.value(1), unit: '0'}));
        a_root.link(links.list.thought_description, a_crt);
        a_crt.link(links.list.thought_description, a_num);
        var b_root = tools.ideas.create();
        var b_crt = tools.ideas.create(a_crt.data());
        var b_num = tools.ideas.create(a_num.data());
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
  }); // end match (part 2)

  describe('rewrite', function() {
    var indeterminate, money, price, wumpus, any, empty, wumpusUpdateIdea;
    var sg, p, w, a, e, wu;
    var priceData, wumpusData, priceUpdate, priceUpdate2, wumpusUpdate, wumpusUpdate2, anyData, anyUpdate;

    beforeEach(function() {
      indeterminate = discrete.definitions.create(['true', 'false', 'maybe']);
      tools.ideas.clean(indeterminate);
      money = tools.ideas.create();

      priceData = { value: number.value(10), unit: money.id };
      price = tools.ideas.create(priceData);
      wumpusData = { value: 'true', unit: indeterminate.id };
      wumpus = tools.ideas.create(wumpusData);
      anyData = { thing: 42 };
      any = tools.ideas.create(anyData);
      empty = tools.ideas.create();

      sg = new subgraph.Subgraph();
      p = sg.addVertex(subgraph.matcher.id, price, {transitionable:true});
      w = sg.addVertex(subgraph.matcher.id, wumpus, {transitionable:true});
      a = sg.addVertex(subgraph.matcher.id, any, {transitionable:true});
      e = sg.addVertex(subgraph.matcher.id, empty);

      priceUpdate = { value: number.value(20), unit: money.id };
      priceUpdate2 = { value: number.value(30), unit: money.id };
      wumpusUpdate = { value: 'false', unit: indeterminate.id };
      wumpusUpdate2 = { value: 'maybe', unit: indeterminate.id };
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

    it('validate transitions', function() {
      // no transitions
      expect(subgraph.rewrite(sg, [])).to.equal(undefined);

      // invalid
      expect(subgraph.rewrite(sg, ['!@#$ not an id'])).to.equal(undefined);
      expect(subgraph.rewrite(sg, [0])).to.equal(undefined);

      // no transition types defined
      expect(subgraph.rewrite(sg, [{ vertex_id: 0 }])).to.equal(undefined);

      // vertex not transitionable
      expect(subgraph.rewrite(sg, [{ vertex_id: e, replace_id: 0 }])).to.equal(undefined);

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
}); // end subgraph
