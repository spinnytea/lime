var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

var files = ['config.js', 'spec/**/*.js', 'src/core/**/*.js'];

gulp.task('run-mocha', ['jshint'], function() {
  return gulp.src(['spec/**/*.js'], {read: false})
    .pipe(mocha({reporter: 'nyan'}));
    // pro tip:
    //   reporter: 'list'
    //   gulp run-mocha | grep '-' | grep -v 'ms'
});

gulp.task('jshint', [], function () {
  return gulp.src(files).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', ['run-mocha'], function() {
  gulp.watch(files, ['run-mocha']);
});
