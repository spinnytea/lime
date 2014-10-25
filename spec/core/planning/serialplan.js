'use strict';
/* global describe, it */
var expect = require('chai').expect;
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var serialplan = require('../../../src/core/planning/serialplan');

describe('serialplan', function() {
  it('init', function() {
    expect(serialplan.SerialPlan).to.be.a('function');
    expect(Object.keys(blueprint.Blueprint.prototype)).to.deep.equal(['tryTransition']);
    expect(Object.keys(serialplan.SerialPlan.prototype)).to.deep.equal(['tryTransition']);

    var sp = new serialplan.SerialPlan();
    expect(sp.requirements).to.be.ok;
    expect(function() { sp.tryTransition(); }).to.throw('SerialPlan does not implement tryTransition');
  });
});
