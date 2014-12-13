'use strict';
// this name is redundant, but helps to distinguish it from the primitive 'discrete' which means something different
// config.game.grain === 'discrete'

var actuator = require('../../../../src/core/planning/actuator');
var ideas = require('../../../../src/core/database/ideas');
var links = require('../../../../src/core/database/links');
var subgraph = require('../../../../src/core/database/subgraph');

// @param directions: the directions unit idea
// @param agent: the agent type idea
// @param cycle_value: -1 or 1
// @param action_str: 'left' or 'right'
// @param actuator_context: a list of contexts to apply to the idea
exports.turn = function(directions, agent, cycle_value, action_str, actuator_context) {
  var a = new actuator.Action();
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id}, {transitionable:true});
  a.requirements.addEdge(
    agentInstance,
    links.list.type_of,
    a.requirements.addVertex(subgraph.matcher.id, agent)
  );
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_dir, agentDirection);

  a.transitions.push({ vertex_id: agentDirection, cycle: {value: cycle_value, unit: directions.id} });

  a.action = 'wumpus_known_discrete_'+action_str;
  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);
};


// @param agent: the agent type idea
// @param room: the room type idea
// @param actuator_context: a list of contexts to apply to the idea
exports.forward = function(directions, agent, room, actuator_context) {
  var a = new actuator.Action();

  // build the agent
  var agentInstance = a.requirements.addVertex(subgraph.matcher.filler);
  var agentDirection = a.requirements.addVertex(subgraph.matcher.similar, {unit: directions.id});
  // we don't have the roomDefinition at this point
  // besides, we want it to work with any room (not just this game)
  var agentLocation = a.requirements.addVertex(subgraph.matcher.filler, undefined, {transitionable:true});
  a.requirements.addEdge(
    agentInstance,
    links.list.type_of,
    a.requirements.addVertex(subgraph.matcher.id, agent)
  );
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_dir, agentDirection);
  a.requirements.addEdge(agentInstance, links.list.wumpus_sense_agent_loc, agentLocation);


  // build the room set
  var currentRoom = a.requirements.addVertex(subgraph.matcher.discrete, agentLocation, {matchRef:true});
  var roomDirection = a.requirements.addVertex(subgraph.matcher.discrete, agentDirection, {matchRef:true});
  var targetRoom = a.requirements.addVertex(subgraph.matcher.filler);
  a.requirements.addEdge(currentRoom, links.list.wumpus_room_door, roomDirection);
  a.requirements.addEdge(roomDirection, links.list.wumpus_room_door, targetRoom, -1);
  var roomType = a.requirements.addVertex(subgraph.matcher.id, room);
  a.requirements.addEdge(currentRoom, links.list.type_of, roomType);
  // consider this link at a lower priority (find the target room last)
  a.requirements.addEdge(targetRoom, links.list.type_of, roomType, -1);
  // TODO targetRoom must not have a pit


  // all so we can move the agent into the target room
  a.transitions.push({ vertex_id: agentLocation, replace_id: targetRoom });


  a.action = 'wumpus_known_discrete_up';
  a.save();
  actuator_context.forEach(function(ac) {
    ideas.load(a.idea).link(links.list.context, ac);
  });
  ideas.save(a.idea);
};