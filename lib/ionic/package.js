var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    argv = require('optimist').argv,
    prompt = require('prompt'),
    shelljs = require('shelljs/global'),
    FormData = require('form-data'),    
    IonicProject = require('./project'),
    IonicProjectPrivate = require('./private'),
    IonicTask = require('./task').IonicTask,
    IonicUploadTask = require('./upload').IonicUploadTask,
    IonicLoginTask = require('./login').IonicLoginTask;

var IonicPackageTask = function() {
}

IonicPackageTask.HELP_LINE = 'Package an Ionic project using the Ionic Platform Build service (requires login)';

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

      var project = IonicProject.load();
      var projectPrivate = IonicProjectPrivate.load(project.get('app_id'));

      console.log('Grabbing plugins...');
      var plugins = [];
      var pluginExec = exec('cordova plugins');
      if(pluginExec.code != 0 ) {
        process.stderr.write('Unable to read cordova plugin list. Please see console for more info.\n');
      } else {
        pluginExec.output = pluginExec.output.replace(/'/g, '"');
        plugins = JSON.parse(pluginExec.output);
      }

      for(var i = 0; i < platforms.length; i++) {
        var platform = platforms[i];

        prompt.override = argv;
        prompt.start();
        var properties = {};

        // Just prompt for some build properties
        switch (platform) {
          case 'android':
            // Android debug doesn't require anything
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
                  description: 'Key Password (optional)',
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
                  description: 'iOS Mobile Provisioning Profile (.mobileprovision)',
                  message: 'Relative path to your Mobile Provisioning Profile (eg. my.mobileprovision)',
                  required: true
                }, 
              };
            break;
          default:
            process.stderr.write('\nUnknown platform: "'+platform+'"\nSupported platforms currently are "ios" and "android"\n\n');
            continue;
        }

        // Should we just not add this since it's optional?
        // properties.package_name = {
        //   description: 'Package Name (eg. com.mycompany.app) optional',
        //   message: 'Package Name (eg. com.mycompany.app) optional',
        // };

        // Don't prompt for properties we already have in the config
        for (var property in properties) {
          if(projectPrivate.get(property)) {
            delete properties[property];
          }
        }

        prompt.get({properties: properties}, function (err, result) {
          if(err) {
            ionic.fail('Error packaging: ' + err);
          }

          // Overwrite any empty properties with prompt responses
          for (var property in properties) {
            if(result[property] && !projectPrivate.get(property)) {
              projectPrivate.set(property, result[property]);
            }
          }
          projectPrivate.save(project.get('app_id'));

          console.log('Packaging ' + platform + ' app...');

          var form = new FormData();
          form.append('email', project.get('email'));
          form.append('name', project.get('name'));
          form.append('platform', platform);
          form.append('build_mode', mode);
          form.append('csrfmiddlewaretoken', jar.cookies[0].value);

          for (var i = 0; i < plugins.length; i++) {
            form.append('plugin_' + i, plugins[i]);
          };

          // Add the platform specific project properties to the post
          for (var property in projectPrivate.get()) {
            if(property.indexOf(platform) == 0) {
              form.append(property, projectPrivate.get(property));
            }
          }
          
          // Gimmie dem sweet sweet files
          switch(platform) {
            case 'android':
              if(mode == 'release') {
                var keystoreFilePath = path.resolve(projectPrivate.get('android_keystore'));
                if(fs.existsSync(keystoreFilePath)) {
                  form.append('android_keystore_file', fs.createReadStream(keystoreFilePath), {filename: 'www.zip'});
                } else {
                  projectPrivate.remove('android_keystore');
                  projectPrivate.save(project.get('app_id'));
                  process.stderr.write('\nCan\'t find file: "' + keystoreFilePath + '"\nSkipping build..."\n\n');
                  return;
                }
              }
              break;
            case 'ios': 
              var certificateFilePath = path.resolve(projectPrivate.get('ios_certificate'));
              if(fs.existsSync(certificateFilePath)) {
                form.append('ios_certificate_file', fs.createReadStream(certificateFilePath));
              } else {
                projectPrivate.remove('ios_certificate');
                projectPrivate.save(project.get('app_id'));
                process.stderr.write('\nCan\'t find file: "' + certificateFilePath + '"\nSkipping build..."\n\n');
                return;
              }
              var profileFilePath = path.resolve(projectPrivate.get('ios_profile'));
              if(fs.existsSync(profileFilePath)) {
                form.append('ios_profile_file', fs.createReadStream(profileFilePath));
              } else {
                projectPrivate.remove('ios_profile');
                projectPrivate.save(project.get('app_id'));
                process.stderr.write('\nCan\'t find file: "' + profileFilePath + '"\nSkipping build..."\n\n');
                return;
              }
              break;
            default:
              console.trace();
              process.stderr.write('\nUnknown platform: "' + platform + '"\nWe should never get here"\n\n');
              break;
          }

          var url = ionic.IONIC_DASH + 'export/' + project.get('app_id');
          var params = parseUrl(url);

          form.submit({
            host: params.host,
            path: params.path,
            headers: form.getHeaders({
              cookie: jar.cookies.map(function (c) {
                return c.name + "=" + encodeURIComponent(c.value)
              }).join("; ")
            })
          }, function(err, response) {

            response.setEncoding('utf8');
            response.on("data", function(data) {
              var json = JSON.parse(data);
              if(json.errors) {
                for (var j = 0; j < json.errors.length; j++) {
                  process.stderr.write(json.errors[j]);
                }
              }              
            });

            if(err) {
              ionic.fail("Error packaging: " + err);
            }
            console.log('Done');
          }); 
        });
      }
    });  
  });
};

exports.IonicPackageTask = IonicPackageTask;
