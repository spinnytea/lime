'use strict';
var _ = require('lodash');
var expect = require('chai').expect;
var ideas = require('../../../src/database/ideas');
var number = require('../../../src/planning/primitives/number');

var wrongUnit = _.merge(num(1), {unit:'imaunit'});
function num() {
  return {
    type: 'lime_number',
    value: number.value.apply({}, arguments),
    unit: '0'
  };
}

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
    expect(number.combine()).to.equal(undefined);
    expect(number.combine(num(1))).to.equal(undefined);
    // TODO should this throw an exception?
    expect(number.combine(num(1), wrongUnit)).to.equal(undefined);

    expect(number.combine(num(1), num(1))).to.deep.equal(num(2));

    expect(number.combine(num(0), num(3, 4, true, false))).to.deep.equal(num(3, 4, true, false));
    expect(number.combine(num(1), num(4, 5, false, true))).to.deep.equal(num(5, 6, false, true));
    expect(number.combine(num(1, 2, true, false), num(3, 4, false, true))).to.deep.equal(num(4, 6, false));
  });

  it('remove', function() {
    expect(number.remove()).to.equal(undefined);
    expect(number.remove(num(1))).to.equal(undefined);
    expect(number.remove(num(1), wrongUnit)).to.equal(undefined);

    expect(number.remove(num(3), num(2))).to.deep.equal(num(1));

    expect(number.remove(num(0), num(3, 4, true, false))).to.deep.equal(num(-4, -3, true, false));
    expect(number.remove(num(1), num(4, 5, false, true))).to.deep.equal(num(-4, -3, false, true));
    expect(number.remove(num(1, 2, true, false), num(3, 4, false, true))).to.deep.equal(num(-2, true));
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


    var idea = ideas.create({scale: 3});
    function num2() {
      var ret = num.apply({}, arguments);
      ret.unit = idea.id;
      return ret;
    }
    expect(num2(1, 3)).to.deep.equal({ type: 'lime_number', unit: idea.id, value: { bl: true, br: true, l: 1, r: 3 } });

    // scale of 3
    expect(number.difference(num2(1), num2(3))).to.deep.equal(6);
    expect(number.difference(num2(1), num2(11))).to.deep.equal(30);

    idea.update({scale: 0.5});
    expect(number.difference(num2(1), num2(3))).to.deep.equal(1);
    expect(number.difference(num2(1), num2(11))).to.deep.equal(5);
  });
}); // end number