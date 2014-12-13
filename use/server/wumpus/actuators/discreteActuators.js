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
