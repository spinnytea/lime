'use strict';
var ideas = require('../database/ideas');
var links = require('../database/links');
var subgraph = require('../database/subgraph');

//
// Currently, an experience is defined as:
//   state -> action -> state
//

var STATE__IN_PROGRESS = 1; // the experience has been created, but there is no result
var STATE__FINISHED = 2; // the experience has the result

// create an experience with a start and an action
// the experience is in progress, but we want to record it for later
// TODO what if we don't finish it? does that mean something? do we clean them up later
//
// @param before: subgraph before the action was taken
// @param action: the id of the action that's been saved
// @return an idea that represents this experience
exports.start = function(before, action) {
  var idea = ideas.create({
    before: subgraph.stringify(before, true),
    state: STATE__IN_PROGRESS
  });

  // link the action to this experience object
  idea.link(links.list.experience.opposite, action);

  return idea;
};

// save the final state of the experience
// TODO type check?, state check?
//
// @param idea: an idea that represents an experience
// @param before: subgraph after the action has finished
exports.finish = function(idea, after) {
  idea = ideas.load(idea);
  var data = idea.data();

  data.after = subgraph.stringify(after, true);
  data.state = STATE__FINISHED;

  idea.update(data);
};
