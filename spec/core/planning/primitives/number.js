'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var number = require('../../../../src/core/planning/primitives/number');

function num() {
  return {
    type: 'lime_number',
    value: number.value.apply({}, arguments),
    unit: 'test',
  };
}

describe('number', function() {
  var wrongUnit = _.merge(num(1), {unit:'imaunit'});

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(number)).to.deep.equal(['isNumber', 'value', 'combine', 'remove', 'difference']);
  });

  // TODO should this throw an exception?
  it('isNumber', function() {
    expect(number.isNumber(undefined)).to.equal(false);
    expect(number.isNumber({})).to.equal(false);
//    expect(number.isNumber({ type: 'lime_number' })).to.equal(false);
    expect(number.isNumber({ value: { bl: 'true', l: 1, r: 1, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1, br: true } })).to.deep.equal(false);
    expect(number.isNumber({ unit: 'test' })).to.equal(false);

    expect(number.isNumber({ value: { l: 1, r: 1, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, r: 1, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, br: true }, unit: 'test' })).to.deep.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1 }, unit: 'test' })).to.deep.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1, br: true } })).to.deep.equal(false);

    expect(number.isNumber(num(0))).to.deep.equal(true);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1, br: true }, unit: 'test' })).to.deep.equal(true);
  });
  it.skip('isNumber: type only');

  it('value', function() {
    // test our gen function, since it is complex, and we use it a lot
    expect(number.value(0)).to.deep.equal({ bl: true, l: 0, r: 0, br: true });
    expect(number.value(-3)).to.deep.equal({ bl: true, l: -3, r: -3, br: true });
    expect(number.value(0, false)).to.deep.equal({ bl: false, l: 0, r: 0, br: false });
    expect(number.value(0, true, false)).to.deep.equal({ bl: true, l: 0, r: 0, br: false });
    expect(number.value(0, false, true)).to.deep.equal({ bl: false, l: 0, r: 0, br: true });

    expect(number.value(0, 1)).to.deep.equal({ bl: true, l: 0, r: 1, br: true });
    expect(number.value(0, 1, false)).to.deep.equal({ bl: false, l: 0, r: 1, br: false });
    expect(number.value(0, 1, true, false)).to.deep.equal({ bl: true, l: 0, r: 1, br: false });
    expect(number.value(0, 1, false, true)).to.deep.equal({ bl: false, l: 0, r: 1, br: true });

    expect(num(0)).to.deep.equal({ type: 'lime_number', value: { bl: true, l: 0, r: 0, br: true, }, unit: 'test' });
    expect(num(0, 1, true, false)).to.deep.equal({ type: 'lime_number', value: { bl: true, l: 0, r: 1, br: false, }, unit: 'test' });
  });

  it('combine', function() {
    expect(number.combine()).to.equal(undefined);
    expect(number.combine(num(1))).to.equal(undefined);
    // TODO should this throw an exception?
    expect(number.combine(num(1), wrongUnit)).to.equal(undefined);

    expect(number.combine(num(1), num(1))).to.deep.equal(num(2));

    expect(number.combine(num(0), num(3, true, false))).to.deep.equal(num(3, true, false));
    expect(number.combine(num(1), num(4, false, true))).to.deep.equal(num(5, false, true));
    expect(number.combine(num(3, true, false), num(4, false, true))).to.deep.equal(num(7, false));
  });

  it('remove', function() {
    expect(number.remove()).to.equal(undefined);
    expect(number.remove(num(1))).to.equal(undefined);
    expect(number.remove(num(1), wrongUnit)).to.equal(undefined);

    expect(number.remove(num(3), num(2))).to.deep.equal(num(1));

    expect(number.remove(num(0), num(3, true, false))).to.deep.equal(num(-3, true, false));
    expect(number.remove(num(1), num(4, false, true))).to.deep.equal(num(-3, false, true));
    expect(number.remove(num(3, true, false), num(4, false, true))).to.deep.equal(num(-1, false));
  });

  it('difference', function() {
    expect(number.difference()).to.equal(undefined);
    expect(number.difference(num(1))).to.equal(undefined);
    expect(number.difference(num(1), wrongUnit)).to.equal(undefined);

    expect(number.difference(num(1), num(1))).to.equal(0);
    expect(number.difference(num(3), num(1))).to.equal(2);
    expect(number.difference(num(1), num(10))).to.equal(9);

    expect(number.difference(num(1, 3), num(-1))).to.equal(2);
    expect(number.difference(num(1, 3), num(0))).to.equal(1);
    expect(number.difference(num(1, 3), num(1))).to.equal(0);
    expect(number.difference(num(1, 3), num(2))).to.equal(0);
    expect(number.difference(num(1, 3), num(3))).to.equal(0);
    expect(number.difference(num(1, 3), num(4))).to.equal(1);
    expect(number.difference(num(1, 3), num(5))).to.equal(2);
  });
}); // end number