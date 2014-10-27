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

describe.only('number', function() {
  var wrongUnit = _.merge(num(1), {unit:'imaunit'});

  it('init', function() {
    expect(Object.keys(number)).to.deep.equal(['value', 'combine', 'remove']);
  });

  it('isNumber', function() {
    // is number isn't exposed, so we need to first make sure the combine works
    // (if this test fails here, then it's not this test's fault)
    expect(number.combine(num(1), num(1))).to.deep.equal(num(2));

    expect(number.combine(num(1), undefined)).to.equal(undefined);
    expect(number.combine(num(1), {})).to.equal(undefined);
    expect(number.combine(num(1), { value: { bl: 'true', l: 1, r: 1, br: true }, unit: 'test' })).to.equal(undefined);
    expect(number.combine(num(1), { value: { l: 1, r: 1, br: true }, unit: 'test' })).to.equal(undefined);
    expect(number.combine(num(1), { value: { bl: true, r: 1, br: true }, unit: 'test' })).to.equal(undefined);
    expect(number.combine(num(1), { value: { bl: true, l: 1, br: true }, unit: 'test' })).to.deep.equal(undefined);
    expect(number.combine(num(1), { value: { bl: true, l: 1, r: 1 }, unit: 'test' })).to.deep.equal(undefined);
    expect(number.combine(num(1), { value: { bl: true, l: 1, r: 1, br: true } })).to.deep.equal(undefined);

    expect(number.combine(num(1), num(0))).to.deep.equal(num(1));
    expect(number.combine(num(1), { value: { bl: true, l: 1, r: 1, br: true }, unit: 'test' })).to.deep.equal(num(2));
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

    expect(num(0)).to.deep.equal({ type: 'lime_number', value: { bl: true, l: 0, r: 0, br: true, }, unit: 'test' });
    expect(num(0, 1, true, false)).to.deep.equal({ type: 'lime_number', value: { bl: true, l: 0, r: 1, br: false, }, unit: 'test' });
  });

  it('combine', function() {
    expect(number.combine()).to.equal(undefined);
    expect(number.combine(num(1))).to.equal(undefined);
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
});