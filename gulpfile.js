'use strict';
// node_modules/.bin/gulp --harmony mocha
var config = require('./src/config');
var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var rm = require('gulp-rm');

// some aliases
gulp.task('c', ['clean:db']);
gulp.task('m', ['mocha']);

gulp.task('clean:db', function() {
  return gulp.src(config.settings.location + '/**/*', { read: false })
    .pipe(rm());
});

// define which report we will use for the test
// 'nyan' is the best, so that is the default
// 'list' is definitely has it's merits
// 'json' and 'json-stream' are pretty neat
// XXX what about HTMLCov
var reporter = 'nyan';
process.argv.forEach(function(val, idx, array) {
  if(val === '-r' && array[idx+1])
    reporter = array[idx+1];
});

// print out all the tests that have been skipped
if(reporter === 'skipped') {
  reporter = 'list';

  // hacks!
  // inline gulp
  // mocha report: list uses '-' to bullet skipped tests
  // we are going to grep the output to only include those tests
  var write_back = process.stdout.write;
  process.stdout.write = function() {
    if(arguments[0].indexOf('-') === 7)
      write_back.apply(process.stdout, arguments);
  };
}


var files = ['config.js', 'spec/**/*.js', 'src/**/*.js'];

gulp.task('mocha', ['jshint'], function() {
  return gulp.src(['spec/**/*.js'], {read: false})
    .pipe(mocha({reporter: reporter}));
});

gulp.task('jshint', [], function () {
  return gulp.src(files).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', [], function() {
  gulp.watch(files, ['mocha']);
  gulp.start('mocha');
});

gulp.task('coverage', [], function (cb) {
  gulp.src(['src/**/*.js'])
    .pipe(istanbul({
      includeUntested: true
    })) // Covering files
    .pipe(istanbul.hookRequire()) // Force `require` to return covered files
    .on('finish', function () {
      return gulp.src(['spec/**/*.js'], { read: false })
        .pipe(mocha({
          reporter: 'list'
        }))
        .pipe(istanbul.writeReports({
          reporters: ['html']
        }))
        .on('end', cb);
    });
});
