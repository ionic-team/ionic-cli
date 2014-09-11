var Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    exec = require('child_process').exec,
    Q = require('q'),
    IonicProject = require('./project'),
    colors = require('colors');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  if( argv._.length < 2 ) {
    return ionic.fail('Missing setup task command.', 'setup');
  }

  var tasks = argv._.slice(1);

  for(var x=0; x<tasks.length; x++) {
    if(tasks[x].toLowerCase() == 'sass') {
      this.sassSetup(ionic);
    } else {
      return ionic.fail('Invalid setup task command: ' + tasks[x], 'setup');
    }
  }

  IonicStats.t();
};


IonicTask.prototype.sassSetup = function(ionic) {
  var q = Q.defer();
  var self = this;

  this.npmInstall().then(function(){

    var indexPath = path.resolve( path.join('www', ionic.getContentSrc()) );
    var lines, line, keepLine, activeRemoving;
    var cleanedLines = [];

    try {
      lines = fs.readFileSync(indexPath, 'utf8').split('\n');
    } catch(e) {
      q.reject(e);
      return ionic.fail('Error loading ' + indexPath);
    }

    try {
      activeRemoving = false;

      for(x=0; x<lines.length; x++) {
        line = lines[x];
        keepLine = true;

        if( /<!--(.*?) sass (.*?)/gi.test(line) ) {
          line = '    <!-- compiled css output -->';
          activeRemoving = true;
        } else if (activeRemoving && /(.*?)-->(.*?)/gi.test(line) ) {
          keepLine = false;
          activeRemoving = false;
        } else if( /lib\/ionic\/css\/ionic.css|css\/style.css/gi.test(line) ) {
          keepLine = false;
        }

        if(keepLine) {
          cleanedLines.push(line);
        }
      }

      var project = IonicProject.load();
      var gulpStartupTasks = project.get('gulpStartupTasks') || [];
      var hasSass, hasWatch;
      gulpStartupTasks.forEach(function(taskName){
        if(taskName == 'sass') hasSass = true;
        if(taskName == 'watch') hasWatch = true;
      });
      if(!hasSass) gulpStartupTasks.push('sass');
      if(!hasWatch) gulpStartupTasks.push('watch');
      project.set('gulpStartupTasks', gulpStartupTasks);
      if(!project.get('watchPatterns')){
        project.set('watchPatterns', ['www/**/*', '!www/lib/**/*'])
      }
      project.save();

      fs.writeFileSync(indexPath, cleanedLines.join('\n'), 'utf8');

      console.log('Updated '.green.bold + indexPath.bold + ' <link href>'.yellow.bold + ' references to sass compiled css'.green.bold);

      console.log('\nIonic project ready to use Sass!'.green.bold);
      console.log(' * Customize the app using'.yellow.bold, 'scss/ionic.app.scss'.bold);
      console.log(' * Run'.yellow.bold, 'ionic serve'.bold, 'to start a local dev server and watch/compile Sass to CSS'.yellow.bold);
      console.log('');

      self.buildSass().then(function(){
        q.resolve();
      });

    } catch(e) {
      q.reject(e);
      return ionic.fail('Error parsing ' + indexPath + ': ' + e);
    }

  }, function(e){
    q.reject(e);
  });

  return q.promise;
};


IonicTask.prototype.buildSass = function() {
  var q = Q.defer();

  var childProcess = exec('gulp sass');

  childProcess.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  childProcess.stderr.on('data', function (data) {
    if(data) {
      process.stderr.write(data.toString().yellow);
    }
  });

  childProcess.on('exit', function(code){
    process.stderr.write('\n');
    if(code === 0) {
      console.log('Successful '.green.bold + 'sass build'.bold);
      q.resolve();
    } else {
      console.log( 'Error running '.error.bold + 'gulp sass'.bold );
      q.reject();
    }
  });

  return q.promise;
};


IonicTask.prototype.npmInstall = function() {
  var q = Q.defer();

  var childProcess = exec('npm install');

  childProcess.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  childProcess.stderr.on('data', function (data) {
    if(data) {
      data = data.toString();
      if( !/no repository field/gi.test(data) ) {
        process.stderr.write(data.yellow);
      }
    }
  });

  childProcess.on('exit', function(code){
    process.stderr.write('\n');
    if(code === 0) {
      console.log('Successful '.green.bold + 'npm install'.bold);
      q.resolve();
    } else {
      console.log( 'Error running '.error.bold + 'npm install'.bold );
      q.reject();
    }
  });

  return q.promise;
};


exports.IonicTask = IonicTask;
