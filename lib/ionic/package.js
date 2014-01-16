var request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicTask = require('./task').IonicTask,
    IonicUploadTask = require('./upload').IonicUploadTask,
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

        prompt.override = argv;
        prompt.start();
        var properties = {};

        switch (platform) {
          case 'android':
            if(mode == 'release') {
              properties = {
                android_keystore: {
                  description: 'Android Keystore File (.keystore)',
                  message: 'Relative path to your release keystore file (eg. release.keystore)',
                  required: true
                }, 
                android_keystore_alias: {
                  description: 'Keystore Alias',
                  message: 'Alias of the Keystore',
                  required: true
                },
                android_keystore_password: {
                  description: 'Keystore Password',
                  message: 'Password of the Keystore',
                  hidden: true,
                  required: true
                }, 
                android_key_password: {
                  description: 'Key Password',
                  message: 'Password for Key (usually same as Keystore Password and if left blank will use it)',
                  hidden: true,
                }
              };
            }

            break;
          case 'ios':
             properties = {
                ios_certificate: {
                  description: 'iOS Certificate File (.p12)',
                  message: 'Relative path to your certificate file (eg. cert.p12)',
                  required: true
                }, 
                ios_certificate_password: {
                  description: 'Certificate Password',
                  message: 'Password of the Certificate',
                  hidden: true,
                  required: true
                }, 
                ios_profile: {
                  description: 'iOS Mobile Provisioning Profile (.mobileprofile)',
                  message: 'Relative path to your Mobile Provisioning Profile (eg. my.mobileprofile)',
                  required: true
                }, 
              };
            break;
          default:
            process.stderr.write('\nUnknown platform: "'+platform+'"\nSupported platforms currently "ios" and "android"\n\n');
            continue;
        }

        properties.package_name = {
          description: 'Package Name (eg. com.mycompany.app)',
          message: 'Package Name (eg. com.mycompany.app) not required',
        };

        for (var property in properties) {
          if(project[property] && project[project] == '') {
            delete properties[property];
          }
        }

        prompt.get({properties: properties}, function (err, result) {
          if(err) {
            ionic.fail('Error packaging: ' + err);
          }

          for (var property in properties) {
            if(project[property] && project[project] == '') {
              project[property] = result[property];
            }
          }
          ionic.saveConfig(project);
          
          request({
            method: 'POST',
            url: ionic.IONIC_DASH+'export/'+project.app_id,
            jar: jar
          }, 
          function(err, response, body) {
            if(err) {
              ionic.fail("Error packaging: " + err);
            }
          });
        });
      }
      
    });  
  });
};

exports.IonicPackageTask = IonicPackageTask;
