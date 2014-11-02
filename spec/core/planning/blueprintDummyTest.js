'use strict';
/* global describe, it */
var expect = require('chai').expect;
var blueprint = require('../../../src/core/planning/primitives/blueprint');
var serialplan = require('../../../src/core/planning/serialplan');
var actuator = require('../../../src/core/planning/actuator');

describe.only('blueprint chain', function() {
  it('inheritance', function() {
    // constructor
    expect(blueprint.Action).to.be.a('function');
    expect(serialplan.Action).to.be.a('function');
    expect(actuator.Action).to.be.a('function');
    expect(Object.keys(blueprint.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);
    expect(Object.keys(actuator.Action.prototype)).to.deep.equal(['runCost', 'tryTransition', 'runBlueprint']);

    // instance
    var ba = new blueprint.Action();
    var sa = new serialplan.Action();
    var aa = new actuator.Action();
    expect(Object.keys(ba)).to.deep.equal(['requirements']);
    expect(Object.keys(sa)).to.deep.equal(['requirements']);
    expect(Object.keys(aa)).to.deep.equal(['requirements']);

    // this isn't implemented by serialplan
    expect(function() { sa.tryTransition(); }).to.throw('SerialAction does not implement tryTransition');
  });
});
