'use strict';
var expect = require('chai').use(require('sinon-chai')).expect;
var hardsensor = require('../../src/pattern/hardsensor');
var ideas = require('../../src/database/ideas');
var links = require('../../src/database/links');
var number = require('../../src/planning/primitives/number');
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

describe.only('hardsensor', function() {
  require('../database/ideas').mock();
  it('init', function() {
    expect(Object.keys(hardsensor)).to.deep.equal(['Sensor', 'sensors', 'groupfn']);
  });

  describe('Sensor', function() {
    it('init', function() {
      expect(Object.keys(hardsensor.Sensor.prototype)).to.deep.equal(['sense']);
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

      hardsensor.sensors.agent_inside_room = function(state, glueGroup) {
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

        if(!rooms.length)
          return undefined;

        // TODO ensure links
        console.log(rooms);
        void(agent);

        return undefined;
      };


      hs = new hardsensor.Sensor();
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

    it('sense', function() {
      expect(i_agent.link(links.list.agent_inside_room)).to.deep.equal([]);

      hs.sense(context);

      //expect(i_agent.link(links.list.agent_inside_room)).to.deep.equal([i_room1.id]);
    });
  }); // end Sensor

  describe('groupfn', function() {
    it('none', function() {
      var glues = [{ 0:0, 1:1 }, {0:1,1:2}];
      var sets = [[{ 0:0, 1:1 }], [{0:1,1:2}]];
      expect(hardsensor.groupfn.none(glues, undefined)).to.deep.equal(sets);
    });

    it('byOuterIdea', function() {
      // different groups
      var glues = [{ 0:0, 1:1 }, {0:1,1:2}];
      var sets = [[{ 0:0, 1:1 }], [{0:1,1:2}]];
      expect(hardsensor.groupfn.byOuterIdea(glues, 0)).to.deep.equal(sets);

      // same groups
      glues = [{ 0:0, 1:1 }, {0:0,1:2}];
      sets = [[{ 0:0, 1:1 }, {0:0,1:2}]];
      expect(hardsensor.groupfn.byOuterIdea(glues, 0)).to.deep.equal(sets);
    });
  });
}); // end hardsensor