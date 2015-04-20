'use strict';
/* global describe, it */
var _ = require('lodash');
var expect = require('chai').expect;
var blueprint = require('../../src/planning/primitives/blueprint');
var serialplan = require('../../src/planning/serialplan');
var actuator = require('../../src/planning/actuator');

function MockAction() {
  blueprint.Action.call(this);
}
_.extend(MockAction.prototype, blueprint.Action.prototype);


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
  });

  it('throw errors', function() {
    // this isn't implemented by serialplan
    expect(function() { new blueprint.Action().tryTransition(); }).to.throw('BlueprintAction does not implement tryTransition');
    // this method is now implemented, but this is what it looked like before we did
    //expect(function() { sa.tryTransition(); }).to.throw('SerialAction does not implement tryTransition');

    var ma = new MockAction();
    ['runCost', 'tryTransition', 'runBlueprint', 'apply', 'save'].forEach(function(p) {
      expect(function() {
        ma[p]();
      }).to.throw('MockAction does not implement ' + p);
    });
  });

  it.skip('loaders', function() {
    // check to see that an error is thrown if try to construct an object and there is no loader present
    // blueprint.loaders[this.constructor.name]
  });
}); // end blueprint chain
