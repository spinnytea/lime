'use strict';
var expect = require('chai').expect;
var links = require('../../src/database/links');

describe('links', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(links)).to.deep.equal(['create', 'list']);
    expect(Object.keys(links.list).length).to.be.gt(0); // the keys don't matter, just so long as they are enumerable
  });

  it('create/list', function() {
    expect(links.list.thought_description.name).to.equal('thought_description');
    expect(links.list.thought_description.opposite).to.not.equal(links.list.thought_description);
    expect(links.list.thought_description.opposite.opposite).to.equal(links.list.thought_description);

    expect(function() { links.list.thought_description = 'stuff'; }).to.throw(Error);
    expect(function() { links.list.thought_description.name = 'stuff'; }).to.throw(Error);
  });

  it('create undirected', function() {
    var name = '_test__undirected_';
    expect(links.list[name].name).to.equal(name);
    expect(links.list[name].opposite.name).to.equal(name);
    expect(links.list[name].opposite).to.equal(links.list[name]);
  });

  // XXX links needs a type_of hierarchy
  // - when we get the list of links, it should go up the chain
  //describe('type_of', function() {
  //  it.skip('hierarchy');
  //}); // end type_of
}); // end links