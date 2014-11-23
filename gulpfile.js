'use strict';
var gulp = require('gulp');
var gutil = require('gulp-util');
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
var fork = require('child_process').fork;

var browserify = require('gulp-browserify');
var browserSync = require('browser-sync');

gulp.task('use-client-jshint', [], function() {
  return gulp.src(['use/client/js/**/*.js']).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});
gulp.task('use-server-jshint', [], function() {
  return gulp.src(['use/server/**/*.js', 'gulpfile.js']).pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('use-browserify', ['use-client-jshint'], function() {
  return gulp.src('use/client/js/index.js')
    .pipe(browserify({
      debug: true
    }))
    .pipe(gulp.dest('use/client'));
});

var browserSyncSync = false;
var serverHandle;
gulp.task('use-sync', ['use-browserify'], function() {
  if(serverHandle) {
    if(!browserSyncSync) {
      browserSyncSync = true;
      return browserSync({
        proxy: 'localhost:8888',
        port: '8080',
        online: false,
        injectChanges: false,
        open: false,
        logConnections: true,
      });
    } else {
      return browserSync.reload({stream: false});
    }
  } else {
    gutil.log('Server not started, delaying browser sync.');
  }
});

gulp.task('use-server', ['use-server-jshint'], function() {
  if(serverHandle) {
    serverHandle.kill();
  } else {
    serverHandle = fork('use/server');
    serverHandle.on('close', function() {
      serverHandle = fork('use/server');
    });
  }
});

gulp.task('use', [], function() {
  // whenever you change client files, restart the browser
  gulp.watch(['use/client/**/*', '!use/client/index.js'], ['use-sync']);
  // any time the server starts, restart the browser, restart the browser
  gulp.watch('use/server/.stamp', ['use-sync']);

  // any time we make changes to the server, restart the server
  gulp.watch('use/server/**/*', ['use-server']);
//  .on('change', function(event) {
//    gutil.log(gutil.colors.yellow('Server file changed: ' +
//      path.relative(path.join(__dirname, 'use', 'server'), event.path)));
//  });

  // try to start the server the first time
  return gulp.start('use-server');
});
