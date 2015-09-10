'use strict';
// Task 57
//
// People learn to use their vision as they grow.
// They learn that a "dot" can be "inside" another "circle."
// This is what it means for an agent to be in a room,
//   this is why I draw something visual to the screen, so I - the person - can see it.
// But the LM cannot process this information.
// The LM hasn't spent the time building up visual models of what it means to be inside of something.
//
// The way I want to represent "inside" for the LM is based on distance, or math.
// But I haven't taught it any math.
// I haven't taught it to make connections between different kinds of models,
//   and I haven't taught it how to optimize it's math by using a library.
// So.
// My first sensor will be hard coding that optimized sensor the way I expect it will be eventually produced.


// due to serialization of javascript objects...
// all action impls must be registered here
exports.sensors = {};