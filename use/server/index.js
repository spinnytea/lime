'use strict';
var express = require('express');
var path = require('path');
var touch = require('touch');

var app = express();
app.use('/vender', express.static(path.join(__dirname, '..', '..', 'bower_components')));
app.use(express.static(path.join(__dirname, '..', 'client')));
app.listen(8888, function() {
  touch.sync(path.join(__dirname, '.stamp'));
});

var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(3000); // TODO configure port

require('./wumpus/index.js').setup(io.of('/wumpus'));
