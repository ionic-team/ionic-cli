var argv = require('optimist').argv,
    IonicTask = require('./task').IonicTask;

var IonicPlatformTask = function() {
}

IonicPlatformTask.HELP_LINE = 'Configure platform targets for building an Ionic app';

IonicPlatformTask.prototype = new IonicTask();

IonicPlatformTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic platform [more platforms,...]\nSupported platforms currently "ios" and "android"\n\n');
}

IonicPlatformTask.prototype.run = function(ionic) {
  if(argv._.length < 2) {
    IonicPlatformTask.prototype._printUsage();
    ionic.fail('No platforms specified, exiting.');
  }

  // Grab the name of the app
  var platforms = argv._.slice(1);

  if(platforms.length < 1) {
    ionic.fail('No platforms specified, exiting.');
  }

  for(var i = 0; i < platforms.length; i++) {
    var platform = platforms[i];
    console.log('Adding platform', platform);
    if(exec("cordova platform add " + platform).code !== 0) {
      process.stderr.write('Unable to add platform ' + platform + '. Please see console for more info.\n');
    }
  }
};

exports.IonicPlatformTask = IonicPlatformTask;
