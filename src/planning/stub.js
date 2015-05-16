'use strict';
// this builds on a blueprint to represent a possible plan in the world
// its sort of like a higher level plan or a planning shortcut
// it says that this kind of thing CAN be done, but we need to go back later and figure out this section
var _ = require('lodash');
var actuator = require('./actuator');
var blueprint = require('./primitives/blueprint');
var ideas = require('../database/ideas');
var links = require('../database/links');
var subgraph = require('../database/subgraph');

function StubAction() {
  blueprint.Action.call(this);

  // subgraph.rewrite.transitions
  // what the stub will solve for later
  this.transitions = [];
}
_.extend(StubAction.prototype, blueprint.Action.prototype);

// let's take the impl from actuator since it has everything we need
StubAction.prototype.runCost = actuator.Action.prototype.runCost;
StubAction.prototype.tryTransition = actuator.Action.prototype.tryTransition;
StubAction.prototype.apply = actuator.Action.prototype.apply;

// blueprint.save
StubAction.prototype.save = function() {
  var idea;
  if(this.idea)
    idea = ideas.load(this.idea);
  else {
    idea = ideas.create();
    idea.link(links.list.context, blueprint.context);
    this.idea = idea.id;
  }

  idea.update({
    type: 'blueprint',
    subtype: 'StubAction',
    blueprint: {
      idea: this.idea,
      requirements: subgraph.stringify(this.requirements),
      transitions: this.transitions
    }
  });

  return this.idea;
};

exports.Action = StubAction;
blueprint.loaders.StubAction = function(blueprint) {
  var a = new StubAction();
  a.idea = blueprint.idea;
  a.requirements = subgraph.parse(blueprint.requirements);
  a.transitions = blueprint.transitions;
  return a;
};
