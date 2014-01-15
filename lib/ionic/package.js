var request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicTask = require('./task').IonicTask,
    IonicUploadTask = require('./upload').IonicUploadTask;
    IonicLoginTask = require('./login').IonicLoginTask;

var IonicPackageTask = function() {
}

IonicPackageTask.HELP_LINE = 'Package an Ionic project for the given plaform.';

IonicPackageTask.prototype = new IonicTask();

IonicPackageTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic package mode(debug|release) platform [more platforms,...]\n');
}

IonicPackageTask.prototype.run = function(ionic) {
  if(argv._.length < 3) {
    IonicPackageTask.prototype._printUsage();
    ionic.fail('No platforms or build mode specified, exiting.');
  }

  var mode = argv._[1].toLowerCase();
  if(mode != 'debug' && mode != 'release') {
    IonicPackageTask.prototype._printUsage();
    ionic.fail('Package build mode must be debug or release, exiting.');
  }

  var platforms = argv._.slice(2);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  var upload = new IonicUploadTask();
  upload.run(ionic, function() {

    var login = new IonicLoginTask();
    login.get(ionic, function(jar) {

      var project = ionic.loadConfig();

      for(var i = 0; i < platforms.length; i++) {
        var platform = platforms[i];

        switch (platform) {
          case 'android':
            break;
          case 'ios':
            break;
          default:
            process.stderr.write('\nUnknown platform: "'+platform+'"\nSupported platforms currently "ios" and "android"\n\n');
            continue;
        }

        request({
          method: 'POST',
          url: ionic.IONIC_DASH+'export/',
          jar: jar
        }, 
        function(err, response, body) {
          if(err) {
            ionic.fail("Error packaging: " + err);
          }
        });
      }
      
    });  
  });
};

exports.IonicPackageTask = IonicPackageTask;
