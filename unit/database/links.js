'use strict';
var expect = require('chai').expect;
var links = require('../../src/database/links');

describe('links', function() {
  it('init', function() {
    expect(links).to.not.have.property('units');
  });

  describe('create', function() {
    it('directed', function() {
      expect(links.list.thought_description.name).to.equal('thought_description');
      expect(links.list.thought_description.opposite).to.not.equal(links.list.thought_description);
      expect(links.list.thought_description.opposite.opposite).to.equal(links.list.thought_description);

      expect(function() { links.list.thought_description = 'stuff'; }).to.throw(Error);
      expect(function() { links.list.thought_description.name = 'stuff'; }).to.throw(Error);

      expect(links.list.thought_description.isOpp).to.equal(false);
      expect(links.list.thought_description.opposite.isOpp).to.equal(true);
      expect(links.list.thought_description.opposite.opposite.isOpp).to.equal(false);
    });

    it('undirected', function() {
      var name = '_test__undirected_';
      expect(links.list[name].name).to.equal(name);
      expect(links.list[name].opposite.name).to.equal(name);
      expect(links.list[name].opposite).to.equal(links.list[name]);
      expect(links.list[name].isOpp).to.equal(false);
    });

    it('options', function() {
      expect(Object.keys(links.list.thought_description)).to.deep.equal(['transitive']);

      expect(links.list.thought_description.transitive).to.equal(false);
      expect(links.list.type_of.transitive).to.equal(true);
    });
  }); // end create
}); // end links