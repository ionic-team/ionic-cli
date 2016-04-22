var fs = require('fs');
var path = require('path');
var Q = require('q');
var expandTilde = require('expand-tilde');
var _ = require('underscore');
var IonicAppLib = require('ionic-app-lib');
var Utils = IonicAppLib.utils;
var Login = IonicAppLib.login;
var Security = IonicAppLib.security;
var log = IonicAppLib.logging.logger;
var LoginTask = require('./login');
var Prompt = require('./prompt');
var Table = require('./table');
var Task = require('./task').Task;

var Project = IonicAppLib.project;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {

  var cmd;
  var subcmd;

  if (argv._.length < 2) {
    cmd = 'profiles';
  } else {
    cmd = argv._[1];
  }

  var dir = null;
  var project = null;
  var appId = null;

  try {
    dir = process.cwd();
    project = Project.load(dir);
    appId = project.get('app_id');

    if (!appId) {
      throw new Error('Missing Ionic App ID.');
    }
  } catch (ex) {
    return Utils.fail(ex, 'security');
  }

  switch (cmd) {
  case 'profiles':
    if (argv._.length < 3) {
      subcmd = 'list';
    } else {
      subcmd = argv._[2];
    }

    switch (subcmd) {
    case 'add':
      return addSecurityProfile(ionic, argv, dir, appId);
    case 'list':
      return listSecurityProfiles(ionic, argv, dir, appId);
    default:
      return Utils.fail("Unknown subcommand 'profiles " + subcmd + "'.", 'security');
    }
  case 'credentials':
    return addSecurityCredentials(ionic, argv, dir, appId);
  }

  return Utils.fail("Unknown subcommand '" + cmd + "'.", 'security');
};

function addSecurityProfile(ionic, argv, dir, appId) {

  if (argv._.length < 4) {
    return Utils.fail('Specify a name for this Security Profile. Example: ' +
                      "'ionic security profile add \"My New Profile\"'.", 'security');
  }

  var jar;
  var name = argv._[3];

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        log.info('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      jar = j;

      return Security.addProfile(appId, jar, name);
    })
    .then(function() {
      console.success('Added "' + name + '".');
    }, function(err) {
      if (typeof err === 'object') {
        if (err.type === 'ProfileExists') {
          console.error(err.message);
        } else {
          return Q.reject(new Error(err.message));
        }
      }
    })
    .catch(function(ex) {
      Utils.fail(ex, 'package');
    });

}

function listSecurityProfiles(ionic, argv, dir, appId) {

  var jar;

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        log.info('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      jar = j;

      return Security.listProfiles(appId, jar);
    })
    .then(function(body) {
      if (body.data.length === 0) {
        log.info('You don\'t have any Security Profiles yet!');
        log.info('Type ' + 'ionic help security'.yellow + ' to learn how to use Security Profiles.');
      } else {
        var table = new Table({ head: ['name', 'tag', 'android', 'ios'] });

        _.each(body.data, function(profile) {
          table.push([
            profile.name,
            profile.tag,
            typeof profile.credentials.android === 'undefined' ? '✗'.red.bold : '✓'.green.bold,
            typeof profile.credentials.ios === 'undefined' ? '✗'.red.bold : '✓'.green.bold
          ]);
        });

        log.info('');
        log.info(table.toString());
        log.info('');
      }
    })
    .catch(function(ex) {
      Utils.fail(ex, 'security');
    });
}

function addSecurityCredentials(ionic, argv, dir, appId) {

  if (argv._.length < 3) {
    return Utils.fail('Specify a valid platform (android or ios).', 'security');
  }

  if (typeof argv.profile === 'undefined') {
    return Utils.fail('Specify the Security Profile on which these credentials are saved ' +
                      '(--profile <tag>).', 'security');
  }

  var jar;
  var platform = argv._[2];
  var profile = argv.profile;

  if (!_.contains(['android', 'ios'], platform)) {
    return Utils.fail("Invalid platform '" + platform + "', please choose either 'android' or 'ios'.", 'security');
  }

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        log.info('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      var q = Q.defer();

      jar = j;

      if (platform === 'android') {
        if (typeof argv.s !== 'undefined') {
          argv['keystore'] = argv.s;
        }

        if (typeof argv.p !== 'undefined') {
          argv['keystore-password'] = argv.p;
        }

        if (typeof argv.k !== 'undefined') {
          argv['key-alias'] = argv.k;
        }

        if (typeof argv.w !== 'undefined') {
          argv['key-password'] = argv.w;
        }

        Prompt.prompt([
            { name: 'keystore', description: 'Keystore File:'.prompt, required: true },
            { name: 'keystore-password', description: 'Keystore Password:'.prompt, hidden: true, required: true },
            { name: 'key-alias', description: 'Key Alias:'.prompt, required: true },
            { name: 'key-password', description: 'Key Password:'.prompt, hidden: true, required: true }
        ], argv)
          .then(function(result) {
            q.resolve(result);
          })
        .catch(function(ex) {
          q.reject(ex);
        });
      } else if (platform === 'ios') {
        if (typeof argv.c !== 'undefined') {
          argv['cert'] = argv.c;
        }

        if (typeof argv.p !== 'undefined') {
          argv['cert-password'] = argv.p;
        }

        if (typeof argv.r !== 'undefined') {
          argv['provisioning-profile'] = argv.r;
        }

        Prompt.prompt([
            { name: 'cert', description: 'Certificate File:'.prompt, required: true },
            { name: 'cert-password', description: 'Certificate Password:'.prompt, hidden: true, required: true },
            { name: 'provisioning-profile', description: 'Provisioning Profile:'.prompt, required: true }
        ], argv)
          .then(function(result) {
            q.resolve(result);
          })
        .catch(function(ex) {
          q.reject(ex);
        });
      } else {
        q.reject('Unrecognized platform: ' + platform);
      }

      return q.promise;
    })
    .then(function(result) {
      if (platform === 'android') {
        var keystoreFilePath = path.resolve(expandTilde(result['keystore']));
        var keystorePassword = result['keystore-password'];
        var keyAlias = result['key-alias'];
        var keyPassword = result['key-password'];
        var keystoreFileStream = fs.createReadStream(keystoreFilePath);

        return Security.addAndroidCredentials(appId, jar, profile, keystoreFileStream,
                                              keystorePassword, keyAlias, keyPassword);
      } else if (platform === 'ios') {
        var certificateFilePath = path.resolve(expandTilde(result['cert']));
        var certificatePassword = result['cert-password'];
        var provisioningProfileFilePath = path.resolve(expandTilde(result['provisioning-profile']));
        var certificateFileStream = fs.createReadStream(certificateFilePath);
        var provisioningProfileFileStream = fs.createReadStream(provisioningProfileFilePath);

        return Security.addIOSCredentials(appId, jar, profile, certificateFileStream,
                                          certificatePassword, provisioningProfileFileStream);
      }

      return Q.reject('Unrecognized platform.');
    })
    .then(function() {
      console.success('Added ' + platform + ' credentials to your Security Profile.');
    }, function(err) {
      if (typeof err === 'object') {
        if (err.type === 'CredentialsExist') {
          console.error(err.message);
        } else {
          return Q.reject(new Error(err.message));
        }
      }
    })
    .catch(function(ex) {
      Utils.fail(ex, 'package');
    });
}

exports.IonicTask = IonicTask;
