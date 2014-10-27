'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var number = require('../../../../src/core/planning/primitives/number');

describe.only('number', function() {
  var zero = {
    value: { bl: true, l: 0, r: 0, br: true, },
    unit: 'test',
  };
  var one = {
    type: 'lime_number',
    value: { bl: true, l: 1, r: 1, br: true, },
    unit: 'test',
  };
  var two = _.merge({}, one, {value:{l:2, r:2}});
  var three = _.merge({}, one, {value:{l:3, r:3, br:false}});
  var four = _.merge({}, one, {value:{bl: false, l:4, r:4}});
  var seven = _.merge({}, one, {value:{bl: false, l:7, r:7, br:false}});
  var wrongUnit = _.merge({}, one, {unit:'imaunit'});

  it('isNumber', function() {
    // is number isn't exposed, so we need to first make sure the combine works
    // (if this test fails here, then it's not this test's fault)
    expect(number.combine(one, one)).to.deep.equal(two);

    expect(number.combine(one, undefined)).to.equal(undefined);
    expect(number.combine(one, {})).to.equal(undefined);
    expect(number.combine(one, { value: { bl: 'true', l: 1, r: 1, br: true }, unit: 'test' })).to.equal(undefined);
    expect(number.combine(one, { value: { l: 1, r: 1, br: true }, unit: 'test' })).to.equal(undefined);
    expect(number.combine(one, { value: { bl: true, r: 1, br: true }, unit: 'test' })).to.equal(undefined);
    expect(number.combine(one, { value: { bl: true, l: 1, br: true }, unit: 'test' })).to.deep.equal(undefined);
    expect(number.combine(one, { value: { bl: true, l: 1, r: 1 }, unit: 'test' })).to.deep.equal(undefined);
    expect(number.combine(one, { value: { bl: true, l: 1, r: 1, br: true } })).to.deep.equal(undefined);

    expect(number.combine(one, zero)).to.deep.equal(one);
    expect(number.combine(one, { value: { bl: true, l: 1, r: 1, br: true }, unit: 'test' })).to.deep.equal(two);
  });

  it('combine', function() {
    expect(number.combine()).to.equal(undefined);
    expect(number.combine(one)).to.equal(undefined);
    expect(number.combine(one, wrongUnit)).to.equal(undefined);

    expect(number.combine(one, one)).to.deep.equal(two);
    expect(number.combine(zero, three)).to.deep.equal(three);
    expect(number.combine(four, zero)).to.deep.equal(four);

    expect(number.combine(three, four)).to.deep.equal(seven);
  });
});