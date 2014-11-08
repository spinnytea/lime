var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

var files = ['config.js', 'spec/**/*.js', 'src/core/**/*.js'];

gulp.task('run-mocha', ['jshint'], function() {
  return gulp.src(['spec/**/*.js'], {read: false})
    .pipe(mocha({reporter: 'nyan'}));
});

gulp.task('jshint', [], function () {
  return gulp.src(files).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', ['run-mocha'], function() {
  gulp.watch(files, ['run-mocha']);
});

gulp.task('skipped', function() {
  // hacks!
  // inline gulp
  // mocha report: list uses '-' to bullet skipped tests
  // we are going to grep the output to only include those tests
  var write_back = process.stdout.write;
  process.stdout.write = function() {
    if(arguments[0].indexOf('-') === 7)
      write_back.apply(process.stdout, arguments);
  };

  // now, run the tests
  return gulp.src(['spec/**/*.js'], {read: false})
    .pipe(mocha({reporter: 'list'}));
});
