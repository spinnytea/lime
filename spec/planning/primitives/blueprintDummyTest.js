'use strict';
var _ = require('lodash');
var expect = require('chai').expect;
var actuator = require('../../../src/planning/actuator');
var blueprint = require('../../../src/planning/primitives/blueprint');
var serialplan = require('../../../src/planning/serialplan');

function MockAction() {
  blueprint.Action.call(this);
}
_.extend(MockAction.prototype, blueprint.Action.prototype);


describe('blueprintDummyTest', function() {
  it('inheritance', function() {
    // constructor
    expect(blueprint.Action).to.be.a('function');
    expect(serialplan.Action).to.be.a('function');
    expect(actuator.Action).to.be.a('function');
    var proto = ['runCost', 'tryTransition', 'runBlueprint', 'scheduleBlueprint', 'cost', 'apply', 'save', 'prepSave'];
    expect(Object.keys(blueprint.Action.prototype)).to.deep.equal(proto);
    expect(Object.keys(serialplan.Action.prototype)).to.deep.equal(proto);
    expect(_.intersection(Object.keys(actuator.Action.prototype), proto)).to.deep.equal(proto);

    // instance
    var ba = new blueprint.Action();
    var sa = new serialplan.Action([]);
    var aa = new actuator.Action();
    var params = ['requirements', 'transitions', 'causeAndEffect'];
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
    ['runCost', 'tryTransition', 'runBlueprint', 'apply', 'prepSave'].forEach(function(p) {
      expect(function() {
        ma[p]();
      }).to.throw('MockAction does not implement ' + p);
    });
  });

  // check to see that an error is thrown if try to construct an object and there is no loader present
  it('loaders', function() {
    var ma = new MockAction();
    ma.prepSave = function() { return {}; };

    expect(function() { ma.save(); }).to.throw('loader not defined for MockAction');
  });
}); // end blueprint chain
