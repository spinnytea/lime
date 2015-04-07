'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var number = require('../../../src/planning/primitives/number');

function num() {
  return {
    type: 'lime_number',
    value: number.value.apply({}, arguments),
    unit: 'test'
  };
}

describe('number', function() {
  var wrongUnit = _.merge(num(1), {unit:'imaunit'});

  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(number)).to.deep.equal(['isNumber', 'cast', 'value', 'combine', 'remove', 'difference']);
  });

  // TODO should this throw an exception?
  it('isNumber', function() {
    expect(number.isNumber(undefined)).to.equal(false);
    expect(number.isNumber({})).to.equal(false);
    expect(number.isNumber({ value: { bl: 'true', l: 1, r: 1, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1, br: true } })).to.deep.equal(false);
    expect(number.isNumber({ unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: Infinity, r: 1, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: Infinity, br: true }, unit: 'test' })).to.equal(false);

    expect(number.isNumber({ type: 'lime_number' })).to.equal(false);
    expect(number.isNumber({ value: { l: 1, r: 1, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, r: 1, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, br: true }, unit: 'test' })).to.deep.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1 }, unit: 'test' })).to.deep.equal(false);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1, br: true } })).to.deep.equal(false);

    expect(number.isNumber(num(0))).to.deep.equal(true);
    expect(number.isNumber({ value: { bl: true, l: 1, r: 1, br: true }, unit: 'test' })).to.deep.equal(true);

    // unbounded Infinity should be a number
    expect(number.isNumber({ value: { bl: true, l: 1, r: Infinity, br: false }, unit: 'test' })).to.equal(true);
    expect(number.isNumber({ value: { bl: false, l: 1, r: Infinity, br: false }, unit: 'test' })).to.equal(true);
    expect(number.isNumber({ value: { bl: false, l: -Infinity, r: 1, br: true }, unit: 'test' })).to.equal(true);
    expect(number.isNumber({ value: { bl: false, l: -Infinity, r: 1, br: false }, unit: 'test' })).to.equal(true);

    // unbounded null should turn into unbounded infinity
    expect(number.isNumber({ value: { bl: true, l: 1, r: null, br: false }, unit: 'test' })).to.equal(true);
    expect(number.isNumber({ value: { bl: false, l: 1, r: null, br: false }, unit: 'test' })).to.equal(true);
    expect(number.isNumber({ value: { bl: false, l: null, r: 1, br: true }, unit: 'test' })).to.equal(true);
    expect(number.isNumber({ value: { bl: false, l: null, r: 1, br: false }, unit: 'test' })).to.equal(true);

    // bounded null should not be a number
    expect(number.isNumber({ value: { bl: true, l: 1, r: null, br: true }, unit: 'test' })).to.equal(false);
    expect(number.isNumber({ value: { bl: true, l: null, r: 1, br: true }, unit: 'test' })).to.equal(false);
  });

  // do we need to convert number.value.l to Infinity if no type specified?
  // - Yes; the type is not guaranteed
  // TODO should bl false = -Infinity, bl true = Infinity?
  it('isNumber; stringified', function() {
    var val = num(-Infinity, Infinity);
    expect(val.value.l).to.equal(-Infinity);

    // after we stringify the value, Infinity turns to null
    val = JSON.parse(JSON.stringify(val));
    expect(val.value.l).to.equal(null);

    // after we check is number on the value, then null should become Infinity
    expect(number.isNumber(val)).to.equal(true);
    expect(val.value.l).to.equal(-Infinity);

    // after all that, we should have the original value
    expect(val).to.deep.equal({ type: 'lime_number', value: { bl: false, l: -Infinity, r: Infinity, br: false }, unit: 'test' });
  });

  it('cast', function() {
    var num = { value: number.value(0), unit: 'test' };
    expect(num).to.not.have.property('type');

    number.cast(num);

    expect(num).to.have.property('type');
    expect(num.type).to.equal('lime_number');

    // not a number
    expect(number.cast()).to.equal(undefined);
    expect(number.cast({})).to.equal(undefined);
    expect(number.cast({value: 'only'})).to.equal(undefined);
    expect(number.cast({unit: 'only'})).to.equal(undefined);
  });

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

    expect(num(0)).to.deep.equal({ type: 'lime_number', value: { bl: true, l: 0, r: 0, br: true }, unit: 'test' });
    expect(num(0, 1, true, false)).to.deep.equal({ type: 'lime_number', value: { bl: true, l: 0, r: 1, br: false }, unit: 'test' });

    // auto unbound Infinity
    expect(number.value(-Infinity, Infinity, true, true)).to.deep.equal({ bl: false, l: -Infinity, r: Infinity, br: false });
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