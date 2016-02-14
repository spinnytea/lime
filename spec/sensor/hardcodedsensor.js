'use strict';
var expect = require('chai').use(require('sinon-chai')).expect;
var hardcodedsensor = require('../../src/sensor/hardcodedsensor');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
var sensor = require('../../src/sensor/sensor');
var subgraph = require('../../src/database/subgraph');

// all parameters are numbers
// returns true or false
function agent_inside_room(agent_x, agent_y, room_x, room_y, room_r) {
  // if number.difference(room-agent, 0) === 0, then cross
  // --
  // if x,y cross, same place
  // if x cross, do radius on y
  // if y cross, do radius on x
  // if neither, number.difference((-inf, 0), Math.dist(min(abs(x,y)), 0)-max(r)) === 0
  //  - or do we switch min and max? above is the 'best chance' match, swapping will give 'worst chance' match
  //  - or do we keep mins/maxs, and check both independently? (either would be a success)
  //
  // oooororrrr
  // insteeeaaaaddddd
  // just do a dist fn on the l and r
  // if either pass, then return true

  var dx = agent_x.l - room_x.l;
  var dy = agent_y.l - room_y.l;
  var dr = room_r.l;
  if(dr*dr > dx*dx + dy*dy)
    return true;

  dx = agent_x.r - room_x.r;
  dy = agent_y.r - room_y.r;
  dr = room_r.r;
  if(dr*dr > dx*dx + dy*dy)
    return true;

  return false;
}

describe('hardcodedsensor', function() {
  require('../database/ideas').mock();
  it('init', function() {
    expect(Object.keys(hardcodedsensor)).to.deep.equal(['Sensor', 'sensors', 'groupfn']);
  });

  describe('Sensor', function() {
    it('init', function() {
      expect(Object.keys(hardcodedsensor.Sensor.prototype)).to.deep.equal(['save', 'prepSave', 'sense']);
    });

    var i_x_unit, i_y_unit, i_r_unit, context, hs;
    var i_room_type, i_agent, i_a_x, i_a_y, i_room1, i_room2, i_r1_x, i_r1_y, i_r1_r, i_r2_x, i_r2_y, i_r2_r;
    var c_room_type, c_agent, c_a_x, c_a_y, c_room1, c_room2, c_r1_x, c_r1_y, c_r1_r, c_r2_x, c_r2_y, c_r2_r;
    var h_room_type, h_agent, h_a_x, h_a_y, h_room, h_r_x, h_r_y, h_r_r;
    before(function() {
      context = new subgraph.Subgraph();
      i_x_unit = ideas.create();
      i_y_unit = ideas.create();
      i_r_unit = ideas.create();


      i_room_type = ideas.create();
      i_agent = ideas.create();
      i_a_x = ideas.create(number.cast({ value: number.value(0), unit: i_x_unit.id }));
      i_a_y = ideas.create(number.cast({ value: number.value(0), unit: i_y_unit.id }));
      i_room1 = ideas.create();
      i_r1_x = ideas.create(number.cast({ value: number.value(0), unit: i_x_unit.id }));
      i_r1_y = ideas.create(number.cast({ value: number.value(0), unit: i_y_unit.id }));
      i_r1_r = ideas.create(number.cast({ value: number.value(1), unit: i_r_unit.id }));
      i_room2 = ideas.create();
      i_r2_x = ideas.create(number.cast({ value: number.value(6), unit: i_x_unit.id }));
      i_r2_y = ideas.create(number.cast({ value: number.value(6), unit: i_y_unit.id }));
      i_r2_r = ideas.create(number.cast({ value: number.value(1), unit: i_r_unit.id }));

      i_agent.link(links.list.property, i_a_x);
      i_agent.link(links.list.property, i_a_y);
      i_room1.link(links.list.type_of, i_room_type);
      i_room1.link(links.list.property, i_r1_x);
      i_room1.link(links.list.property, i_r1_y);
      i_room1.link(links.list.property, i_r1_r);
      i_room2.link(links.list.type_of, i_room_type);
      i_room2.link(links.list.property, i_r2_x);
      i_room2.link(links.list.property, i_r2_y);
      i_room2.link(links.list.property, i_r2_r);


      c_room_type = context.addVertex(subgraph.matcher.id, i_room_type);
      c_agent = context.addVertex(subgraph.matcher.id, i_agent);
      c_a_x = context.addVertex(subgraph.matcher.id, i_a_x);
      c_a_y = context.addVertex(subgraph.matcher.id, i_a_y);
      c_room1 = context.addVertex(subgraph.matcher.id, i_room1);
      c_r1_x = context.addVertex(subgraph.matcher.id, i_r1_x);
      c_r1_y = context.addVertex(subgraph.matcher.id, i_r1_y);
      c_r1_r = context.addVertex(subgraph.matcher.id, i_r1_r);
      c_room2 = context.addVertex(subgraph.matcher.id, i_room2);
      c_r2_x = context.addVertex(subgraph.matcher.id, i_r2_x);
      c_r2_y = context.addVertex(subgraph.matcher.id, i_r2_y);
      c_r2_r = context.addVertex(subgraph.matcher.id, i_r2_r);

      context.addEdge(c_agent, links.list.property, c_a_x);
      context.addEdge(c_agent, links.list.property, c_a_y);
      context.addEdge(c_room1, links.list.type_of, c_room_type);
      context.addEdge(c_room1, links.list.property, c_r1_x);
      context.addEdge(c_room1, links.list.property, c_r1_y);
      context.addEdge(c_room1, links.list.property, c_r1_r);
      context.addEdge(c_room2, links.list.type_of, c_room_type);
      context.addEdge(c_room2, links.list.property, c_r2_x);
      context.addEdge(c_room2, links.list.property, c_r2_y);
      context.addEdge(c_room2, links.list.property, c_r2_r);


      // agent --inside-> room
      links.create('agent_inside_room');

      hardcodedsensor.sensors.agent_inside_room = function(state, glueGroup) {
        var agent = '0';
        var agent_x = '1';
        var agent_y = '2';
        var room = '4';
        var room_x = '5';
        var room_y = '6';
        var room_r = '7';

        var rooms = glueGroup.filter(function(glue) {
          return agent_inside_room(
            state.getData(glue[agent_x]).value,
            state.getData(glue[agent_y]).value,
            state.getData(glue[room_x]).value,
            state.getData(glue[room_y]).value,
            state.getData(glue[room_r]).value
          );
        }).map(function(glue) {
          return state.getIdea(glue[room]);
        });

        return {
          ensureLinks: links.list.agent_inside_room,
          from: state.getIdea(glueGroup[0][agent]),
          to: rooms
        };
      };


      hs = new hardcodedsensor.Sensor();
      hs.sensor = 'agent_inside_room';
      h_agent = hs.requirements.addVertex(subgraph.matcher.id, i_agent);
      h_a_x = hs.requirements.addVertex(subgraph.matcher.similar, { unit: i_x_unit.id });
      h_a_y = hs.requirements.addVertex(subgraph.matcher.similar, { unit: i_y_unit.id });
      h_room_type = hs.requirements.addVertex(subgraph.matcher.id, i_room_type);
      h_room = hs.requirements.addVertex(subgraph.matcher.filler);
      h_r_x = hs.requirements.addVertex(subgraph.matcher.similar, { unit: i_x_unit.id });
      h_r_y = hs.requirements.addVertex(subgraph.matcher.similar, { unit: i_y_unit.id });
      h_r_r = hs.requirements.addVertex(subgraph.matcher.similar, { unit: i_r_unit.id });

      hs.requirements.addEdge(h_agent, links.list.property, h_a_x);
      hs.requirements.addEdge(h_agent, links.list.property, h_a_y);
      hs.requirements.addEdge(h_room, links.list.type_of, h_room_type);
      hs.requirements.addEdge(h_room, links.list.property, h_r_x);
      hs.requirements.addEdge(h_room, links.list.property, h_r_y);
      hs.requirements.addEdge(h_room, links.list.property, h_r_r);

      hs.groupfn = 'byOuterIdea';
      hs.groupConfig = h_agent;


      // for simplicity, these values are hardcoded in the agent_inside_room
      expect(h_agent).to.equal('0');
      expect(h_a_x).to.equal('1');
      expect(h_a_y).to.equal('2');
      expect(h_room).to.equal('4');
      expect(h_r_x).to.equal('5');
      expect(h_r_y).to.equal('6');
      expect(h_r_r).to.equal('7');

      // make sure the context is setup correctly
      //expect(subgraph.search(context)).to.deep.equal([context]);
      expect(context.concrete).to.equal(true);
      // make sure we have the requirements and context setup correctly
      expect(subgraph.match(context, hs.requirements).length).to.equal(2);
    });

    it('agent_inside_room fn', function() {
      var agent_x = number.value(0);
      var agent_y = number.value(0);
      var room_x = number.value(10);
      var room_y = number.value(10);
      var room_r = number.value(1);

      expect(agent_inside_room(agent_x, agent_y, room_x, room_y, room_r)).to.equal(false);

      room_r.r = 100;
      expect(agent_inside_room(agent_x, agent_y, room_x, room_y, room_r)).to.equal(true);
    });

    it('prepSave & load', function() {
      // make a fake ID for this test
      // (pretend it's gone through s.save())
      hs.idea = '_test_';

      var data = hs.prepSave();

      // the data needs to be able to go through
      expect(JSON.parse(JSON.stringify(data))).to.deep.equal(data);
      expect(data.type).to.equal('sensor');
      expect(data.subtype).to.equal('HardcodedSensor');
      expect(data).to.have.property('sensor');


      var loaded = sensor.loaders.HardcodedSensor(data.sensor);
      expect(loaded).to.be.an.instanceOf(hardcodedsensor.Sensor);
      expect(loaded).to.deep.equal(hs); // this is our real test
    });

    it('sense', function() {
      expect(i_agent.link(links.list.agent_inside_room)).to.deep.equal([]);

      hs.sense(context);

      expect(i_agent.link(links.list.agent_inside_room)).to.deep.equal([i_room1]);

      var data = i_a_x.data();
      data.value.l = 6;
      data.value.r = 6;
      i_a_x.update(data);
      context.deleteData();
      hs.sense(context);

      expect(i_agent.link(links.list.agent_inside_room)).to.deep.equal([]);

      data = i_a_y.data();
      data.value.l = 6;
      data.value.r = 6;
      i_a_y.update(data);
      context.deleteData();
      hs.sense(context);

      expect(i_agent.link(links.list.agent_inside_room)).to.deep.equal([i_room2]);
    });
  }); // end Sensor

  describe('groupfn', function() {
    it('none', function() {
      var glues = [{ 0:0, 1:1 }, {0:1,1:2}];
      var sets = [[{ 0:0, 1:1 }], [{0:1,1:2}]];
      expect(hardcodedsensor.groupfn.none(glues, undefined)).to.deep.equal(sets);
    });

    it('byOuterIdea', function() {
      // different groups
      var glues = [{ 0:0, 1:1 }, {0:1,1:2}];
      var sets = [[{ 0:0, 1:1 }], [{0:1,1:2}]];
      expect(hardcodedsensor.groupfn.byOuterIdea(glues, 0)).to.deep.equal(sets);

      // same groups
      glues = [{ 0:0, 1:1 }, {0:0,1:2}];
      sets = [[{ 0:0, 1:1 }, {0:0,1:2}]];
      expect(hardcodedsensor.groupfn.byOuterIdea(glues, 0)).to.deep.equal(sets);
    });
  }); // end groupfn

  describe('sensor', function() {
    it('list', function() {
      var hs = new hardcodedsensor.Sensor();
      expect(hs.idea).to.equal(undefined);

      hs.save();

      expect(hs.idea).to.not.equal(undefined);

      var idea = hs.idea;

      hs.save();

      expect(hs.idea).to.equal(idea);
      expect(hs.idea).to.deep.equal(idea);

      // attach the hs to an arbitrary additional context
      var context = ideas.create();
      ideas.load(hs.idea).link(links.list.context, context);


      // search for our sensor
      // (basic)
      // if we have data from a use case, so we need to ensure this sensor is included in the list
      var list = sensor.list();
      expect(list.length).to.be.gt(0);
      expect(list.map(function(i) { return i.id; })).to.include(hs.idea);

      // search for our sensor
      // ([])
      // an empty list is still valid; should be the same as providing no context
      list = sensor.list([]);
      expect(list.length).to.be.gt(0);
      expect(list.map(function(i) { return i.id; })).to.include(hs.idea);

      // search for our sensor
      // (ID string)
      list = sensor.list(context.id);
      expect(list.length).to.equal(1);
      expect(list[0].id).to.equal(hs.idea);

      // search for our sensor
      // (proxy idea)
      list = sensor.list(context);
      expect(list.length).to.equal(1);
      expect(list[0].id).to.equal(hs.idea);

      // search for our actuator
      // ([ID string])
      list = sensor.list([context.id]);
      expect(list.length).to.equal(1);
      expect(list[0].id).to.equal(hs.idea);

      // search for our actuator
      // ([proxy idea])
      list = sensor.list([context]);
      expect(list.length).to.equal(1);
      expect(list[0].id).to.equal(hs.idea);

      // search for our sensor
      // returns nothing
      list = sensor.list('not a valid context');
      expect(list.length).to.equal(0);
    });

    it('load', function() {
      var hs = new hardcodedsensor.Sensor();
      hs.save();
      expect(hs.idea).to.not.equal(undefined);

      var loaded = sensor.load(hs.idea);

      expect(loaded).to.not.equal(hs);
      expect(loaded).to.deep.equal(hs);

      // load fail
      var dummyIdea = ideas.create();
      loaded = sensor.load(dummyIdea);
      expect(loaded).to.equal(undefined);
    });
  }); // end sensor
}); // end hardcodedsensor