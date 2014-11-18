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
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var nodemon = require('gulp-nodemon');
var source = require('vinyl-source-stream');
var watchify = require('watchify');

gulp.task('use-jshint', [], function() {
  return gulp.src(['use/server/**/*.js', 'use/client/js/**/*.js']).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

var bundler = watchify(browserify(['./use/client/js/index.js'], {
  debug: true,
  cache: {},
  packageCache: {},
  fullPaths: true,
}));
// use watchify to decide when to rebundle
//bundler.on('update', function() { return rebundle(); });
var rebundle = function() {
  return bundler.bundle()
    .pipe(source('client/index.js'))
    .pipe(buffer())
    .pipe(gulp.dest('use'));
}
gulp.task('use-browserify', ['use-jshint'], function() {
  return rebundle();
});

gulp.task('uses', ['use-browserify'], function(done) {
  // use gulp to decide when to rebundle
  // this lets us use js hint
  gulp.watch(['use/client/**/*.js', '!use/client/index.js'], ['use-browserify']);

  var called = false;
  return nodemon({
    script: 'use/server/index.js',
    ext: 'js',
    watch: ['use/server'],
    ignore: [],
    verbose: false,
  })
  .on('start', function() {
    if(!called) {
      done();
      called = true;
    }
  });
});
