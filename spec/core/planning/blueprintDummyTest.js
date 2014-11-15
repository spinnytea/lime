'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var serialplan = require('../../../src/core/planning/serialplan');
var actuator = require('../../../src/core/planning/actuator');

describe('blueprint_chain', function() {
  it('inheritance', function() {
    // constructor
    expect(blueprint.Action).to.be.a('function');
    expect(serialplan.Action).to.be.a('function');
    expect(actuator.Action).to.be.a('function');
    var proto = ['runCost', 'tryTransition', 'runBlueprint', 'cost', 'apply', 'save'];
    expect(Object.keys(blueprint.Action.prototype)).to.deep.equal(proto);
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(proto);
    expect(_.intersection(Object.keys(actuator.Action.prototype), proto)).to.deep.equal(proto);

    // instance
    var ba = new blueprint.Action();
    var sa = new serialplan.Action([]);
    var aa = new actuator.Action();
    var params = ['requirements'];
    expect(Object.keys(ba)).to.deep.equal(params);
    expect(_.intersection(Object.keys(sa), params)).to.deep.equal(params);
    expect(_.intersection(Object.keys(aa), params)).to.deep.equal(params);

    // this isn't implemented by serialplan
    expect(function() { ba.tryTransition(); }).to.throw('BlueprintAction does not implement tryTransition');

    // this method is now implemented, but this is what it looked like before we did
//    expect(function() { sa.tryTransition(); }).to.throw('SerialAction does not implement tryTransition');
  });
}); // end blueprint chain
