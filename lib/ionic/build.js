var fs = require('fs'),
    request = require('request'),
    shelljs = require('shelljs/global'),
    argv = require('optimist').argv,
    IonicTask = require('./task').IonicTask,
    IonicLoginTask = require('./login.js').IonicLoginTask;

var IonicBuildTask = function() {
}

IonicBuildTask.HELP_LINE = 'Build an Ionic project for the given plaform.';

IonicBuildTask.prototype = new IonicTask();

IonicBuildTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    ionic.fail('No plaform specified, exiting.');
  }

  // Grab the platform build for the app
  this.platform = argv._[1];

  if(!fs.existsSync(ionic.IONIC_CONFIG)) {
    ionic.fail('Could not find ' + ionic.IONIC_CONFIG + '!'+
      ' Please run this command your root ionic project directory with that file.');
  }
  var project = JSON.parse(fs.readFileSync(ionic.IONIC_CONFIG));

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    request({
      method: 'POST',
      url: ionic.IONIC_DASH+ionic.IONIC_API+'export/',
      jar: jar
    }, 
    function(err, response, body) {
      if(err) {
        ionic.fail(err);
      }
    });
    console.log(jar);
  });
  
};

exports.IonicBuildTask = IonicBuildTask;
