var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    shelljs = require('shelljs/global'),
    unzip = require('unzip'),
    argv = require('optimist').argv,
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
    process.stderr.write('Exiting.\n');
    process.exit(1);
  }

  console.log('Creating Ionic app in folder', this.targetPath, 'based on', starterProject, 'project');

  fs.mkdirSync(this.targetPath);

  this._fetchAndWriteSeed(starterProject);
  this._writeConfig(ionic);

};

IonicStartTask.prototype._getStarterUrl = function(repo) {
  return 'https://github.com/driftyco/' + repo + '/archive/master.zip' ;
};

IonicStartTask.prototype._fetchAndWriteSeed = function(projectType) {
  var self = this;

  var repoName = 'ionic-starter-' + projectType;
  var repoFolderName = repoName + '-master';
  var templateUrl = this._getStarterUrl(repoName);

  console.log('Downloading starter template from', templateUrl);

  var tmpFolder = os.tmpdir();
  var tempZipFilePath = path.join(tmpFolder, repoName + new Date().getTime() + '.zip');
  var tempZipFileStream = fs.createWriteStream(tempZipFilePath)

  var unzipRepo = function(fileName) {
    var readStream = fs.createReadStream(fileName);

    var writeStream = unzip.Extract({ path: self.targetPath });
    writeStream.on('close', function() {
      //fs.renameSync(self.targetPath + '/' + 'ionic-angular-cordova-seed-master', self.targetPath + '/app');
      cp('-R', self.targetPath + '/' + repoFolderName + '/.', self.targetPath);
      rm('-rf', self.targetPath + '/' + repoFolderName + '/');
      console.log('Project created!');

      cd(self.targetPath);
      console.log('Initializing cordova project.');
      if(!exec('cordova plugin add org.apache.cordova.device') || !exec('cordova plugin add org.apache.cordova.console') ||
        !exec('cordova plugin add org.apache.cordova.statusbar')) {
          process.stderr.write('Unable to install one or more cordova plugins.\n');
      }

      IonicStats.t('start', {});
    });
    readStream.pipe(writeStream);
  };

  request({ url: templateUrl, encoding: null }, function(err, res, body) {
    if(res.statusCode !== 200) {
      console.error('Error: Unable to fetch project: HTTP', res.statusCode);
      console.error('Valid project types are blank, tabs, or sidemenu (or see more on our starter page: http://ionicframework.com/getting-started/)');
      return;
    }
    tempZipFileStream.write(body);
    tempZipFileStream.close();
    unzipRepo(tempZipFilePath);
  });
};

IonicStartTask.prototype._writeConfig = function(ionic) {
  var project = IonicProject.create();  
  project.set('name', this.appName);
  project.save(this.targetPath);
};

IonicStartTask.prototype._checkTargetPath = function() { 
  if(fs.existsSync(this.targetPath)) {
    process.stderr.write('The directory ' + this.targetPath + ' already exists, please remove it if you would like to create a new ionic project there.\n');
    return false;
  }
  return true;
};

exports.IonicStartTask = IonicStartTask;
