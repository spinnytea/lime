'use strict';
var expect = require('chai').expect;
var ideas = require('../../../src/database/ideas');
var number = require('../../../src/planning/primitives/number');

describe('number', function() {
  require('../../database/ideas').mock();

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(number)).to.deep.equal(['isNumber', 'cast', 'value', 'combine', 'remove', 'difference']);
  });

  it('isNumber', function() {
    expect(number.isNumber(undefined)).to.equal(false);
    expect(number.isNumber({})).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1, br: true }, unit: '0' })).to.deep.equal(true);
  });

  it('cast', function() {
    expect(number.cast({ value: number.value(0), unit: '0' })).to.deep.equal({ type: 'lime_number', value: number.value(0), unit: '0' });
    expect(number.cast({})).to.equal(undefined);
  });

  it('value', function() {
    expect(number.value(0)).to.deep.equal({ bl: true, l: 0, r: 0, br: true });
  });

  it('combine', function() {
    expect(number.combine(
      { type: 'lime_number', value: { bl: true, l: 1, r: 1, br: true }, unit: '0' },
      { type: 'lime_number', value: { bl: true, l: 1, r: 1, br: true }, unit: '0' }
    )).to.deep.equal(
      { type: 'lime_number', value: { bl: true, l: 2, r: 2, br: true }, unit: '0' }
    );
  });

  it('remove', function() {
    expect(number.remove(
      { type: 'lime_number', value: { bl: true, l: 3, r: 6, br: true }, unit: '0' },
      { type: 'lime_number', value: { bl: true, l: 2, r: 4, br: true }, unit: '0' }
    )).to.deep.equal(
      { type: 'lime_number', value: { bl: true, l: 1, r: 2, br: true }, unit: '0' }
    );
  });

  it('difference', function() {
    expect(number.difference(
      { value: number.value(1), unit: '0' },
      { value: number.value(3), unit: '0' }
    )).to.deep.equal(2);

    var idea = ideas.create({scale: 3});

    expect(number.difference(
      { value: number.value(1), unit: idea.id },
      { value: number.value(3), unit: idea.id }
    )).to.deep.equal(6);

    idea.update({scale: 0.5});

    expect(number.difference(
      { value: number.value(1), unit: idea.id },
      { value: number.value(3), unit: idea.id }
    )).to.deep.equal(1);
  });
}); // end number