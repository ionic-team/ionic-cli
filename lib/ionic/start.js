var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    shelljs = require('shelljs/global'),
    unzip = require('unzip'),
    argv = require('optimist').argv,
    colors = require('colors'),
    Q = require('q'),
    IonicProject = require('../ionic'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask;
    IonicStats = require('./stats').IonicStats;

fs.mkdirParent = function(dirPath, mode, callback) {
  //Call the standard fs.mkdir
  fs.mkdir(dirPath, mode, function(error) {
    //When it fail in this way, do the custom steps
    if (error && error.errno === 34) {
      //Create all the parents recursively
      fs.mkdirParent(path.dirname(dirPath), mode, callback);
      //And then the directory
      fs.mkdirParent(dirPath, mode, callback);
    }
    //Manually run the callback since we used our own callback to do all these
    callback && callback(error);
  });
};

var IonicStartTask = function() {
}

// The URL for the cordova wrapper project
IonicStartTask.WRAPPER_REPO_NAME = 'ionic-cordova-wrapper';

IonicStartTask.HELP_LINE = 'Start a new Ionic project with the given name.';

IonicStartTask.prototype = new IonicTask();

IonicStartTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic start appName [starterProject(blank,tabs,sidemenu)]\n');
};

IonicStartTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    ionic.fail('No app name specified, exiting.');
  }

  // Grab the name of the app
  this.appName = argv._[1];

  // Grab the target path from the command line, or use this as the app name
  var targetPathName = this.appName;

  var starterProject = argv._[2] || 'tabs';

  this.targetPath = path.resolve(this.appName);

  // Make sure to create this, or ask them if they want to override it
  if(this._checkTargetPath() === false) {
    process.stderr.write('\nExiting.\n');
    process.exit(1);
  }

  console.log('Creating Ionic app in folder', this.targetPath, 'based on', starterProject.info.bold, 'project');

  fs.mkdirSync(this.targetPath);

  this._fetchAndWriteSeed(starterProject);
  this._writeConfig(ionic);

};

IonicStartTask.prototype._getStarterUrl = function(repo) {
  return 'https://github.com/driftyco/' + repo + '/archive/master.zip' ;
};

IonicStartTask.prototype._fetchWrapper = function() {
  var q = Q.defer();
  var self = this;

  var repoName = IonicStartTask.WRAPPER_REPO_NAME;
  var repoUrl = 'https://github.com/driftyco/' + IonicStartTask.WRAPPER_REPO_NAME + '/archive/master.zip';
  console.log('Fetching', 'Cordova'.info.bold, 'wrapper');

  Ionic.fetchRepo(self.targetPath, repoName, repoUrl).then(function(repoFolderName) {
    cp('-R', self.targetPath + '/' + repoFolderName + '/.', self.targetPath);
    rm('-rf', self.targetPath + '/' + repoFolderName + '/');
    cd(self.targetPath);

    q.resolve(self.targetPath);
  }, function(err) {
    q.reject(err);
  });

  return q.promise;
};

IonicStartTask.prototype._fetchAndWriteSeed = function(projectType) {
  var self = this;

  // First, grab the wrapper project.

  var wrapperPromise = this._fetchWrapper();

  wrapperPromise.then(function(targetPath) {
    // Get the starter project repo name:
    var repoName = 'ionic-starter-' + projectType;

    // The folder name the project will be downloaded and extracted to
    var repoFolderName = repoName + '-master';

    // Get the URL for the starter project repo:
    var repoUrl = self._getStarterUrl(repoName);

    Ionic.fetchRepo(self.targetPath, repoName, repoUrl).then(function(repoFolderName) {
      // Move the content of this repo into the www folder
      cp('-R', targetPath + '/' + repoFolderName + '/.', 'www');

      // Copy the root config file to the www folder
      cp(targetPath + '/config.xml', 'www');

      // Clean up start template folder
      rm('-rf', targetPath + '/' + repoFolderName + '/');

      console.log('Initializing cordova project.'.info.bold);
      if(!exec('cordova plugin add org.apache.cordova.device') || !exec('cordova plugin add org.apache.cordova.console') ||
        !exec('cordova plugin add org.apache.cordova.statusbar')) {
          process.stderr.write('Unable to install one or more cordova plugins.\n'.error.bold);
      }

      self._printQuickHelp();

      IonicStats.t('start', {});
    }, function(err) {
      console.error('Error: Unable to fetch project: HTTP'.error.bold, res.statusCode);
      console.error('Valid project types are blank, tabs, or sidemenu (or see more on our starter page: http://ionicframework.com/getting-started/)'.error.bold);
      Ionic.fail('');
    });

  }, function(err) {
    Ionic.fail('Unable to grab wrapper project:'.error.bold, err);
  });

};

IonicStartTask.prototype._printQuickHelp = function() {
  console.log('\nYour Ionic project is ready to go!'.green.bold);
  console.log('\nSome quick tips:');
  console.log(' * Make sure to add a platform (ios or Android):', 'ionic platform add android [ios]'.info.bold);
  console.log('    Note: iOS development requires OS X currently'.small);
  console.log('\n * cd into your project directory before running any of the following commands'.info.bold);
  console.log('\n * To build your project, run', 'ionic build [platform]'.info.bold);
  console.log('\n * To emulate your project in a simulator or emulator, run', 'ionic emulate [platform]'.info.bold);
  console.log('\n * To run your project on a device, run', 'ionic run [platform]'.info.bold);
  console.log('\n\nFor more help, visit the Ionic docs:', 'http://ionicframework.com/docs'.info.bold);
};

IonicStartTask.prototype._writeConfig = function(ionic) {
  var project = IonicProject.create();  
  project.set('name', this.appName);
  project.save(this.targetPath);
};

IonicStartTask.prototype._checkTargetPath = function() { 
  if(fs.existsSync(this.targetPath)) {
    process.stderr.write('The directory '.error.bold + this.targetPath + ' already exists, please remove it if you would like to create a new ionic project there.\n'.error.bold);
    return false;
  }
  return true;
};

exports.IonicStartTask = IonicStartTask;
