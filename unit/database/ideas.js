'use strict';
var expect = require('chai').use(require('sinon-chai')).expect;
var config = require('../../src/config');
var ideas = require('../../src/database/ideas');

describe('ideas', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(ideas.units)).to.deep.equal(['memory', 'filepath', 'filename']);
    // memory is a data structure, so it doesn't need to be tested directly
  });

  it('filepath', function() {
    expect(ideas.units.filepath('')).to.equal(config.settings.location + '');
    expect(ideas.units.filepath('1')).to.equal(config.settings.location + '');
    expect(ideas.units.filepath('12')).to.equal(config.settings.location + '');
    expect(ideas.units.filepath('123')).to.equal(config.settings.location + '/12');
    expect(ideas.units.filepath('1234')).to.equal(config.settings.location + '/12');
    expect(ideas.units.filepath('12345')).to.equal(config.settings.location + '/12/34');
    expect(ideas.units.filepath('123456')).to.equal(config.settings.location + '/12/34');
    expect(ideas.units.filepath('1234567')).to.equal(config.settings.location + '/12/34/56');
  });

  it('filename', function() {
    expect(ideas.units.filename('1', 'data')).to.equal(config.settings.location + '/1_data.json');
    expect(ideas.units.filename('123', 'links')).to.equal(config.settings.location + '/12/123_links.json');
  });
}); // end ideas