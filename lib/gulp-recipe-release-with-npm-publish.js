var conventional_changelog = require('gulp-conventional-changelog');
var conventional_github_releaser = require('conventional-github-releaser');
var fs = require('fs');
var gulp = require('gulp');
var gulp_bump = require('gulp-bump');
var gulp_git = require('gulp-git');
var gulp_util = require('gulp-util');
var run_sequence = require('run-sequence');
var spawn = require('child_process').spawn;


gulp.task('changelog', function () {
  return gulp.src('CHANGELOG.md', {
    buffer: false
  })
  .pipe(conventional_changelog({
    preset: 'angular'
  }))
  .pipe(gulp.dest('./'));
});

gulp.task('github-release', function(done) {
  conventional_github_releaser({
    type: "oauth",
    token: process.env.CONVENTIONAL_GITHUB_RELEASER_TOKEN 
  }, {
    preset: 'angular' // Or to any other commit message convention you use.
  }, done);
});

gulp.task('bump-version', function () {
// We hardcode the version change type to 'patch' but it may be a good idea to
// use minimist (https://www.npmjs.com/package/minimist) to determine with a
// command argument whether you are doing a 'major', 'minor' or a 'patch' change.
  return gulp.src(['./bower.json', './package.json'])
    .pipe(gulp_bump({type: "patch"}).on('error', gulp_util.log))
    .pipe(gulp.dest('./'));
});

gulp.task('commit-changes', function () {
  return gulp.src('.')
    .pipe(gulp_git.add())
    .pipe(gulp_git.commit('[Prerelease] Bumped version number'));
});

gulp.task('push-changes', function (cb) {
  gulp_git.push('origin', 'master', cb);
});

gulp.task('create-new-tag', function (cb) {
  var version = getPackageJsonVersion();
  gulp_git.tag(version, 'Created Tag for version: ' + version, function (error) {
    if (error) {
      return cb(error);
    }
    gulp_git.push('origin', 'master', {args: '--tags'}, cb);
  });

  function getPackageJsonVersion () {
    // We parse the json file instead of using require because require caches
    // multiple calls so the version number won't be updated
    return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
  }
});

gulp.task('npm', function (done) {
  spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', done);
});


gulp.task('release', function (callback) {
  run_sequence(
    'bump-version',
    'changelog',
    'commit-changes',
    'push-changes',
    'create-new-tag',
    'github-release',
    'npm',
    function (error) {
      if (error) {
        console.log(error.message);
      } else {
        console.log('RELEASE FINISHED SUCCESSFULLY');
      }
      callback(error);
    });
});

exports.gulp = gulp;