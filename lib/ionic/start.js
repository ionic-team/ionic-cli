var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    shelljs = require('shelljs/global'),
    argv = require('optimist').argv,
    colors = require('colors'),
    spawn = require('child_process').spawn,
    Q = require('q'),
    xml2js = require('xml2js'),
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

var IonicStartTask = function() {};

// The URL for the cordova wrapper project
IonicStartTask.WRAPPER_REPO_NAME = 'ionic-app-base';

IonicStartTask.prototype = new IonicTask();

IonicStartTask.prototype.run = function(ionic) {
  this.ionic = ionic;

  if(argv._.length < 2) {
    return this.ionic.fail('Invalid command', 'start');
  }

  // Grab the app's relative directory name
  this.appDirectory = argv._[1];

  // Grab the name of the app from -a or  --app. Defaults to appDirectory if none provided
  this.appName = argv['app-name'] || argv.a;
  if(!this.appName) {
    var appNameSplit = this.appDirectory.split('/');
    appNameSplit = appNameSplit[ appNameSplit.length -1 ].split('\\');
    this.appName = appNameSplit[ appNameSplit.length -1 ];
  }

  this.packageName = argv.id || argv.i;
  this.isCordovaProject = (argv.cordova !== false && !argv.w);

  // start project template can come from cmd line args -t, --template, or the 3rd arg, and defaults to tabs
  var starterProject = argv.template || argv.t || argv._[2] || 'tabs';

  this.targetPath = path.resolve(this.appDirectory);

  // Make sure to create this, or ask them if they want to override it
  if(this._checkTargetPath() === false) {
    process.stderr.write('\nExiting.\n');
    process.exit(1);
  }

  console.log('Creating Ionic app in folder', this.targetPath, 'based on', starterProject.info.bold, 'project');

  fs.mkdirSync(this.targetPath);

  this._fetchAndWriteSeed(starterProject.toLowerCase());

  if(ionic.hasFailed) return;

  this._writeProjectFile(ionic);

};

IonicStartTask.prototype._getStarterUrl = function(repo) {
  return 'https://github.com/driftyco/' + repo + '/archive/master.zip' ;
};

IonicStartTask.prototype._fetchWrapper = function() {
  var q = Q.defer();
  var self = this;

  var repoName = IonicStartTask.WRAPPER_REPO_NAME;
  var repoUrl = 'https://github.com/driftyco/' + IonicStartTask.WRAPPER_REPO_NAME + '/archive/master.zip';

  Ionic.fetchRepo(self.targetPath, repoName, repoUrl).then(function(repoFolderName) {
    cp('-R', self.targetPath + '/' + repoFolderName + '/.', self.targetPath);
    rm('-rf', self.targetPath + '/' + repoFolderName + '/');
    cd(self.targetPath);

    if(!self.isCordovaProject) {
      // remove any cordova files/directories if they only want the www
      var cordovaFiles = ['hooks/', 'platforms/', 'plugins/', 'config.xml'];
      for(var x=0; x<cordovaFiles.length; x++) {
        rm('-rf', self.targetPath + '/' + cordovaFiles[x]);
      }
    }

    q.resolve(self.targetPath);
  }, function(err) {
    q.reject(err);
  }).catch(function(err) {
    return self.ionic.fail('Error: Unable to fetch wrapper repo: ' + err);
  });

  return q.promise;
};

IonicStartTask.prototype._installCordovaPlugins = function() {
  var q = Q.defer();

  console.log('Initializing cordova project.'.info.bold);
  exec('cordova plugin add org.apache.cordova.device && ' +
       'cordova plugin add org.apache.cordova.console && ' +
       'cordova plugin add https://github.com/driftyco/ionic-plugins-keyboard',
       function(err, stdout, stderr) {
          if(err) {
            q.reject(stderr);
          } else {
            q.resolve(stdout);
          }
  });

  return q.promise;
};

IonicStartTask.prototype._updateConfigXml = function() {
  var self = this;
  console.log('\nUpdate config.xml'.info.bold);

  try {
    var configXmlPath = self.targetPath + '/config.xml';
    var configString = fs.readFileSync(configXmlPath, { encoding: 'utf8' });

    var parseString = xml2js.parseString;
    parseString(configString, function (err, jsonConfig) {
      if(err) {
        return self.ionic.fail('Error parsing config.xml: ' + err);
      }

      if(!self.packageName) {
        var packageName = self.appDirectory + Math.round((Math.random() * 899999) + 100000);
        self.packageName = 'com.ionicframework.' + packageName.replace(/\./g, '');
      }

      jsonConfig.widget.$.id = self.packageName.replace(/ /g, '').replace(/-/g, '').replace(/_/g, '').toLowerCase().trim();
      jsonConfig.widget.name = [ self.appName ];

      var xmlBuilder = new xml2js.Builder();
      configString = xmlBuilder.buildObject(jsonConfig);

      fs.writeFile(configXmlPath, configString, function(err) {
        if(err) {
          return self.ionic.fail('Error saving config.xml file: ' + err);
        }
      });
    });

  } catch(e) {
    return self.ionic.fail('Error updating config.xml file: ' + e);
  }
};

IonicStartTask.prototype._fetchAndWriteSeed = function(projectType) {
  var self = this;

  // First, grab the wrapper project.
  var wrapperPromise = this._fetchWrapper();

  wrapperPromise.then(function() {
    // Get the starter project repo name:
    var repoName = 'ionic-starter-' + projectType;

    // The folder name the project will be downloaded and extracted to
    var repoFolderName = repoName + '-master';

    // Get the URL for the starter project repo:
    var repoUrl = self._getStarterUrl(repoName);

    Ionic.fetchRepo(self.targetPath, repoName, repoUrl).then(function(repoFolderName) {
      var npmQ = Q.defer();
      var gulpQ = Q.defer();
      var pluginQ = Q.defer();
      // Install dependencies for the starter project

      // Move the content of this repo into the www folder
      cp('-Rf', self.targetPath + '/' + repoFolderName + '/.', 'www');

      // Clean up start template folder
      rm('-rf', self.targetPath + '/' + repoFolderName + '/');

      if(self.isCordovaProject) {
        // update the config.xml file from cmd line args
        self._updateConfigXml();

        if(self.ionic.hasFailed) return;

        self._installCordovaPlugins().then(function(output) {
          pluginQ.resolve();
        }, function(err) {
          pluginQ.reject(err);
        });
      } else {
        pluginQ.resolve();
      }

      pluginQ.promise.then(function() {
        self._printQuickHelp(self.appDirectory);
      }, function(err) {
        return self.ionic.fail('Unable to add plugins. Perhaps your version of Cordova is too old. Try updating (npm install -g cordova), removing this project folder, and trying again.');
      });

      IonicStats.t();

    }).catch(function(err) {
      console.error('Error: Unable to fetch project: HTTP:'.error.bold,  err.statusCode, err);
      console.error('Valid project types are blank, tabs, or sidemenu (or see more on our starter page: http://ionicframework.com/getting-started/)'.error.bold);
      return self.ionic.fail('');
    });

  }, function(err) {
    return self.ionic.fail( ('Unable to grab wrapper project: ' + err).error.bold );

  }).catch(function(err) {
    console.error('Error: Unable to fetch wrapper: HTTP:'.error.bold,  err.statusCode, err);
    return self.ionic.fail('');
  });

};

IonicStartTask.prototype._printQuickHelp = function(projectDirectory) {
  console.log('\nYour Ionic project is ready to go!'.green.bold);
  console.log('\nSome quick tips:');
  console.log('\n * cd into your project:', ('$ cd ' + projectDirectory).info.bold);
  console.log('\n * Develop in the browser with live reload:', 'ionic serve'.info.bold);

  if(this.isCordovaProject) {
    console.log('\n * Add a platform (ios or Android):', 'ionic platform add ios [android]'.info.bold);
    console.log('    Note: iOS development requires OS X currently'.small);
    console.log('    See the Android Platform Guide for full Android installation instructions:'.small);
    console.log('    https://cordova.apache.org/docs/en/3.4.0/guide_platforms_android_index.md.html#Android%20Platform%20Guide'.small);
    console.log('\n * Build your app:', 'ionic build <PLATFORM>'.info.bold);
    console.log('\n * Simulate your app:', 'ionic emulate <PLATFORM>'.info.bold);
    console.log('\n * Run your app on a device:', 'ionic run <PLATFORM>'.info.bold);
    console.log('\n * Package an app using Ionic package service:', 'ionic package <MODE> <PLATFORM>'.info.bold);
  }
  console.log('\n\nFor more help use', 'ionic --help'.info.bold, 'or visit the Ionic docs:', 'http://ionicframework.com/docs'.info.bold, '\n');
};

IonicStartTask.prototype._writeProjectFile = function(ionic) {
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
