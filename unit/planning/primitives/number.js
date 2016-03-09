'use strict';
var expect = require('chai').expect;
var number = require('../../../src/planning/primitives/number');

exports.mock = function() {
  var getScale_bak = number.boundaries.getScale;
  var getScale_one = function() { return 1; };
  beforeEach(function() { number.boundaries.getScale = getScale_one; });
  afterEach(function() { number.boundaries.getScale = getScale_bak; });
};

function num() {
  return {
    type: 'lime_number',
    value: number.value.apply({}, arguments),
    unit: '_test'
  };
}

describe('number', function() {
  exports.mock();

  it('init', function() {
    expect(Object.keys(number)).to.deep.equal(['isNumber', 'cast', 'value', 'combine', 'remove', 'difference']);
  });

  it('isNumber', function() {
    expect(number.isNumber()).to.equal(false);
    expect(number.isNumber(1)).to.equal(false);
    expect(number.isNumber({type:'lime_number',value:{bl:true,l:1,r:1,br:true},unit:'_test'})).to.equal(true);
    expect(number.isNumber({type:'invalid',value:{bl:true,l:1,r:1,br:true},unit:'_test'})).to.equal(false);
    expect(number.isNumber({type:'lime_number',value:{bl:false,l:null,r:null,br:false},unit:'_test'})).to.equal(true);
    expect(number.isNumber({type:'lime_number',value:{bl:true,l:2,r:1,br:true},unit:'_test'})).to.equal(false);
    expect(number.isNumber({type:'lime_number',value:{bl:true,l:null,r:null,br:false},unit:'_test'})).to.equal(false);
    expect(number.isNumber({type:'lime_number',value:{bl:false,l:null,r:null,br:true},unit:'_test'})).to.equal(false);
    expect(number.isNumber({type:'lime_number',value:{bl:false,l:1,r:1,br:true},unit:'_test'})).to.equal(false);
  });

  it('isNumber; stringified', function() {
    var val = num(-Infinity, Infinity);
    expect(val.value.l).to.equal(-Infinity);
    expect(val.value.r).to.equal(Infinity);

    // after we stringify the value, Infinity turns to null
    val = JSON.parse(JSON.stringify(val));
    expect(val.value.l).to.equal(null);
    expect(val.value.r).to.equal(null);

    // after we check is number on the value, then null should become Infinity
    expect(number.isNumber(val)).to.equal(true);
    expect(val.value.l).to.equal(-Infinity);
    expect(val.value.r).to.equal(Infinity);

    // after all that, we should have the original value
    expect(val).to.deep.equal({ type: 'lime_number', value: { bl: false, l: -Infinity, r: Infinity, br: false }, unit: '_test' });
  });

  it('cast', function() {
    var num = { value: number.value(0), unit: '0' };
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

    // auto unbound Infinity
    expect(number.value(-Infinity, Infinity, true, true)).to.deep.equal({ bl: false, l: -Infinity, r: Infinity, br: false });
  });

  it('combine', function() {
    expect(number.combine()).to.equal(undefined);
    expect(number.combine(num(1))).to.equal(undefined);
    expect(number.combine(num(1), { value: number.value(1), unit: '_mismatch' })).to.equal(undefined);

    expect(number.combine(num(1), num(1))).to.deep.equal(num(2));

    expect(number.combine(num(0), num(3, 4, true, false))).to.deep.equal(num(3, 4, true, false));
    expect(number.combine(num(1), num(4, 5, false, true))).to.deep.equal(num(5, 6, false, true));
    expect(number.combine(num(1, 2, true, false), num(3, 4, false, true))).to.deep.equal(num(4, 6, false));
  });

  it('remove', function() {
    expect(number.remove()).to.equal(undefined);
    expect(number.remove(num(1))).to.equal(undefined);
    expect(number.remove(num(1), { value: number.value(1), unit: '_mismatch' })).to.equal(undefined);

    expect(number.remove(num(3), num(2))).to.deep.equal(num(1));

    expect(number.remove(num(0), num(3, 4, true, false))).to.deep.equal(num(-4, -3, true, false));
    expect(number.remove(num(1), num(4, 5, false, true))).to.deep.equal(num(-4, -3, false, true));
    expect(number.remove(num(1, 2, true, false), num(3, 4, false, true))).to.deep.equal(num(-2, true));
  });

  it('difference', function() {
    expect(number.difference()).to.equal(undefined);
    expect(number.difference(num(1))).to.equal(undefined);
    expect(number.difference(num(1), { value: number.value(1), unit: '_mismatch' })).to.equal(undefined);

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

    number.boundaries.getScale = function() { return 3; };

    expect(number.difference(num(1), num(3))).to.deep.equal(6);
    expect(number.difference(num(1), num(11))).to.deep.equal(30);

    number.boundaries.getScale = function() { return 0.5; };

    expect(number.difference(num(1), num(3))).to.deep.equal(1);
    expect(number.difference(num(1), num(11))).to.deep.equal(5);
  });
}); // end number