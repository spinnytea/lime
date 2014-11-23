'use strict';

exports.room = {};

// how big the room is
exports.room.radius = 48;
exports.room.diameter = exports.room.radius * 2;
// how far away to place the rooms from each other
// this needs to be smaller than the diameter. This also means that the agent might be in two rooms at once
exports.room.spacing = exports.room.diameter - 10;
// computer math isn't perfect, so we need to have a little bit of leeway in our comparisons
exports.room.spacing_err = exports.room.spacing - 1;

// How likely is it for a pit to be generated after we have placed the exit and the gold
exports.pit_probability = 0.5;
