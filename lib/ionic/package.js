var fs = require('fs'),
    _ = require('underscore'),
    Q = require('q'),
    IonicAppLib = require('ionic-app-lib'),
    Utils = IonicAppLib.utils,
    Login = IonicAppLib.login,
    Package = IonicAppLib.package,
    LoginTask = require('./login'),
    Prompt = require('./prompt'),
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

      try {
        if (platform === 'android') {
          if (buildMode === 'debug') {
            q.resolve(Package.packageAndroidDebug(appId, dir, jar));
          } else if (buildMode === 'release') {
            Prompt.prompt([
                { name: 'keystore', description: 'Keystore File:'.prompt, required: true },
                { name: 'keystore-password', description: 'Keystore Password:'.prompt, hidden: true, required: true },
                { name: 'key-alias', description: 'Key Alias:'.prompt, required: true },
                { name: 'key-password', description: 'Key Password:'.prompt, hidden: true, required: true }
            ], argv)
              .then(function(result) {
                var keystoreFilePath = result['keystore'],
                    keystorePassword = result['keystore-password'],
                    keyAlias = result['key-alias'],
                    keyPassword = result['key-password'],
                    keystoreFileStream = fs.createReadStream(keystoreFilePath);

                return q.resolve(Package.packageAndroidRelease(appId, dir, jar, keystoreFileStream, keystorePassword, keyAlias, keyPassword));
              })
              .fail(function(err) {
                return Utils.fail(err);
              })
              .catch(function(ex) {
                return Utils.fail(ex);
              });
          }
        } else if (platform === 'ios') {
          Prompt.prompt([
              { name: 'cert', description: 'Certificate File:'.prompt, required: true },
              { name: 'cert-password', description: 'Certificate Password:'.prompt, hidden: true, required: true },
              { name: 'provisioning-profile', description: 'Provisioning Profile:'.prompt, required: true }
          ], argv)
            .then(function(result) {
              var certificateFilePath = result['cert'],
                  certificatePassword = result['cert-password'],
                  provisioningProfileFilePath = result['provisioning-profile'],
                  certificateFileStream = fs.createReadStream(certificateFilePath),
                  provisioningProfileFileStream = fs.createReadStream(provisioningProfileFilePath);

              return q.resolve(Package.packageIOS(appId, dir, jar, buildMode, certificateFileStream, certificatePassword, provisioningProfileFileStream));
            })
            .fail(function(err) {
              return Utils.fail(err);
            })
            .catch(function(ex) {
              return Utils.fail(ex);
            });
        }
      } catch (ex) {
        q.reject(ex);
      }

      return q.promise;
    })
    .catch(function(ex) {
      return Utils.fail(ex, 'package');
    });

};

exports.IonicTask = IonicTask;
