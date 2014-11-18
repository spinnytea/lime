'use strict';
var express = require('express');
var path = require('path');

var app = express();
app.use('/vender', express.static(path.join(__dirname, '..', '..', 'bower_components')));
app.use(express.static(path.join(__dirname, '..', 'client')));
app.listen(8080);