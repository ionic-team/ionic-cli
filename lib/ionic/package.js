var request = require('request'),
    argv = require('optimist').argv,
    IonicTask = require('./task').IonicTask,
    IonicLoginTask = require('./login.js').IonicLoginTask;

var IonicPackageTask = function() {
}

IonicPackageTask.HELP_LINE = 'Package an Ionic project for the given plaform.';

IonicPackageTask.prototype = new IonicTask();

IonicPackageTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic package platform [more platforms,...]\n');
}

IonicPackageTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    IonicPackageTask.prototype._printUsage();
    ionic.fail('No platforms specified, exiting.');
  }

  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  var project = ionic.loadConfig();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    for(var i = 0; i < platforms.length; i++) {
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
    }
  });  
};

exports.IonicPackageTask = IonicPackageTask;
