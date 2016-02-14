'use strict';
var _ = require('lodash');
var expect = require('chai').expect;

var sensor = require('../../src/sensor/sensor');

describe('sensor', function() {
  it('init', function() {
    // this is to ensure we test everything
    expect(Object.keys(sensor)).to.deep.equal(['Sensor', 'loaders', 'load', 'list', 'context']);
    // there isn't a need to test loaders directly
    // when we test the load of hardcodedsensor, etc then loaders will be tested through them
    // we can't test list without anything to retrieve; this will be tested in the prototypes that need it
    expect(sensor.context).to.not.equal(undefined);

    expect(Object.keys(sensor.Sensor.prototype)).to.deep.equal(['save', 'prepSave']);
    // we can't test save without an implementation
  });

  describe('Sensor', function() {
    function MockSensor() {
      sensor.Sensor.call(this);
    }
    _.extend(MockSensor.prototype, sensor.Sensor.prototype);

    it('prepSave', function() {
      expect(function() { new MockSensor().prepSave(); }).to.throw('MockSensor does not implement prepSave');
    });
  }); // end Sensor
}); // end sensor