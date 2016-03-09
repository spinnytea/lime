'use strict';
var expect = require('chai').expect;
var number = require('../../../src/planning/primitives/number');

describe('number', function() {
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
    var val = { value: number.value(-Infinity, Infinity), unit: '_test' };
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

  it.skip('combine');

  it.skip('remove');

  it.skip('difference');
}); // end number