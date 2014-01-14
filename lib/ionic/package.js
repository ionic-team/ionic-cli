var request = require('request'),
    argv = require('optimist').argv,
    IonicTask = require('./task').IonicTask,
    IonicLoginTask = require('./login.js').IonicLoginTask;

var IonicPackageTask = function() {
}

IonicPackageTask.HELP_LINE = 'Package an Ionic project for the given plaform.';

IonicPackageTask.prototype = new IonicTask();

IonicPackageTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    ionic.fail('No plaform specified, exiting.');
  }

  // Grab the platform build for the app
  this.platform = argv._[1];

  var project = ionic.loadConfig();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    request({
      method: 'POST',
      url: ionic.IONIC_DASH+'export/',
      jar: jar
    }, 
    function(err, response, body) {
      if(err) {
        ionic.fail("Error building: " + err);
      }
    });
    console.log(jar);
    console.log(project.name);
  });  
};

exports.IonicPackageTask = IonicPackageTask;
