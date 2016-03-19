'use strict';
var expect = require('chai').expect;
var links = require('../../src/database/links');

describe('links', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(links)).to.deep.equal(['Link', 'create', 'list']);
    expect(Object.keys(links.list).length).to.be.gt(0); // the keys don't matter, just so long as they are enumerable
  });

  it('Link', function() {
    expect(new links.Link()).to.deep.equal({});
  });

  it('create', function() {
    var key = '_some__test__key_';
    expect(links.list[key]).to.equal(undefined);

    links.create(key);

    expect(links.list[key]).to.be.an('Object');
    expect(links.list[key].name).to.equal(key);

    // XXX we can't delete the property as the links are currently defined
    // delete links.list[key];
    // expect(links.list[key]).to.equal(undefined);
  });

  it('list', function() {
    expect(links.list.thought_description).to.be.an('Object');
    expect(links.list.type_of).to.be.an('Object');
  });
}); // end links