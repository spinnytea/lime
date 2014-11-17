var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');

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


var files = ['config.js', 'spec/**/*.js', 'src/core/**/*.js'];

gulp.task('run-mocha', ['jshint'], function() {
  return gulp.src(['spec/**/*.js'], {read: false})
    .pipe(mocha({reporter: reporter}));
});

gulp.task('jshint', [], function () {
  return gulp.src(files).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', ['run-mocha'], function() {
  gulp.watch(files, ['run-mocha']);
});


//
// targets for the use cases
//
var browserify = require('gulp-browserify');

gulp.task('use-jshint', [], function() {
  return gulp.src(['use/server/**/*.js', 'use/client/js/**/*.js']).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});
gulp.task('use-browserify', ['use-jshint'], function() {
  gulp.src('use/client/js/index.js')
    .pipe(browserify({
      debug: true,
      shim: {
        'angular': {
          path: 'bower_components/angular/angular.js',
          exports: 'angular',
        },
        'angular-route': {
          path: 'bower_components/angular-route/angular-route.js',
          exports: 'ngRoute',
          depends: { angular: 'angular' }
        },
      },
    }))
    .pipe(gulp.dest('use/client'));
});
