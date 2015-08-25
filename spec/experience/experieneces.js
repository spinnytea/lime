'use strict';
var expect = require('chai').expect;

var experiences = require('../../src/experience/experiences');
var links = require('../../src/database/links');
var subgraph = require('../../src/database/subgraph');

describe('experiences', function() {
  require('../database/ideas').mock();

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(experiences)).to.deep.equal(['start', 'finish']);
  });

  it('start', function() {
    var before = new subgraph.Subgraph();
    var action = '_test';

    var idea = experiences.start(before, action);

    // test the result
    expect(idea).to.not.equal(undefined);
    var data = idea.data();
    expect(subgraph.parse(data.before)).to.deep.equal(before);
    expect(idea.link(links.list.experience.opposite).map(function(proxy) { return proxy.id; })).to.deep.equal([action]);
    expect(data.state).to.equal(1); // the actual value is sort of arbitrary; it's an internal constant
  });

  it('finish', function() {
    var before = new subgraph.Subgraph();
    var action = '_test';
    var after = new subgraph.Subgraph();
    // we need to init our experience first
    var idea = experiences.start(before, action);

    experiences.finish(idea, after);

    // test the result
    var data = idea.data();
    expect(subgraph.parse(data.before)).to.deep.equal(before);
    expect(idea.link(links.list.experience.opposite).map(function(proxy) { return proxy.id; })).to.deep.equal([action]);
    expect(subgraph.parse(data.after)).to.deep.equal(after);
    expect(data.state).to.equal(2); // the actual value is sort of arbitrary; it's an internal constant
  });
}); // end experiences