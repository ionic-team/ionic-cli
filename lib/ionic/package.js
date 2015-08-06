var fs = require('fs'),
    prompt = require('prompt'),
    _ = require('underscore'),
    Q = require('q'),
    IonicAppLib = require('ionic-app-lib'),
    Utils = IonicAppLib.utils,
    Login = IonicAppLib.login,
    Package = IonicAppLib.package,
    LoginTask = require('./login'),
    Task = require('./task').Task;

var Project = IonicAppLib.project;
var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {

  if (argv._.length < 2) {
    return Utils.fail("Specify a valid platform (android or ios).", 'package')
  }

  var dir = null,
      project = null,
      appId = null,
      platform = argv._[1],
      buildMode = argv.release ? 'release' : 'debug';

  if (!_.contains(['android', 'ios'], platform)) {
    return Utils.fail("Invalid platform '" + platform + "', please choose either 'android' or 'ios'.", 'package');
  }

  try {
    dir = process.cwd();
    project = Project.load(dir);
    appId = project.get('app_id');
  } catch (ex) {
    return Utils.fail(ex, 'package');
  }

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        console.log('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(jar) {
      var q = Q.defer();

      if (platform === 'android') {
        if (buildMode === 'debug') {
          q.resolve(Package.packageAndroidDebug(appId, dir, jar));
        } else if (buildMode === 'release') {
          prompt.override = argv;
          prompt.message = '';
          prompt.delimiter = '';
          prompt.start();

          prompt.get([
              { name: 'keystore', description: 'Keystore File'.yellow.bold, required: true },
              { name: 'keystore-password', description: 'Keystore Password'.yellow.bold, hidden: true, required: true },
              { name: 'key-alias', description: 'Key Alias'.yellow.bold, required: true },
              { name: 'key-password', description: 'Key Password'.yellow.bold, hidden: true, required: true }
          ], function(err, result) {
            var keystoreFilePath = result['keystore'],
                keystorePassword = result['keystore-password'],
                keyAlias = result['key-alias'],
                keyPassword = result['key-password'],
                keystoreFileStream = fs.createReadStream(keystoreFilePath);

            q.resolve(Package.packageAndroidRelease(appId, dir, jar, keystoreFileStream, keystorePassword, keyAlias, keyPassword));
          });
        }
      }

      return q.promise;
    })
    .catch(function(ex) {
      return Utils.fail(ex, 'package');
    });

};

exports.IonicTask = IonicTask;
