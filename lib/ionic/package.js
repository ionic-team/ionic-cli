var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    parseUrl = require('url').parse,
    spawn = require("child_process").spawn,
    argv = require('optimist').argv,
    prompt = require('prompt'),
    shelljs = require('shelljs/global'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    IonicTask = require('./task').IonicTask,
    IonicUploadTask = require('./upload').IonicUploadTask,
    IonicLoginTask = require('./login').IonicLoginTask;

var IonicPackageTask = function() {};

IonicPackageTask.HELP_LINE = 'Package an app using the Ionic Platform Build service (requires login)';

IonicPackageTask.prototype = new IonicTask();


IonicPackageTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage:\nionic package mode[debug|release] platform[ios,android]\n');
};


IonicPackageTask.prototype.run = function(ionic) {
  var self = this;
  self.ionic = ionic;

  self.project = IonicProject.load();

  if(argv['clear-signing'] || argv.c) {
    self.clearSigning();
    return;
  }

  self.loadProject();

  var login = new IonicLoginTask();
  login.get(self.ionic, function(jar) {
    self.jar = jar;

    self.loadAppSigning(function(){
      self.packagePlatforms(self.platforms);
    });
  });

};


IonicPackageTask.prototype.clearSigning = function() {
  var self = this;
  console.log('Clearing app signing and credential information...'.yellow);

  var appId = self.project.get('app_id');

  if(!appId) {
    self.ionic.fail('App Id is not known');
  }

  var login = new IonicLoginTask();
  login.get(self.ionic, function(jar) {
    var options = {
      url: self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + appId + '/signing/clear',
      headers: {
        cookie: jar.cookies.map(function (c) {
          return c.name + "=" + encodeURIComponent(c.value);
        }).join("; ")
      }
    };

    request(options, function(err, response, body) {
      if(err) {
        self.ionic.fail("Error clearing app signing: " + err);
      }
      console.log( ('App (' + appId + ') signing and credential information cleared\n').green );
    });
  });
};


IonicPackageTask.prototype.loadProject = function() {
  console.log( ("Loading " + this.project.get('name')).bold.yellow );

  if(argv._.length < 3) {
    IonicPackageTask.prototype._printUsage();
    this.ionic.fail('No platforms or build mode specified.');
  }

  this.mode = argv._[1].toLowerCase();
  if(this.mode != 'debug' && this.mode != 'release') {
    IonicPackageTask.prototype._printUsage();
    this.ionic.fail('Package build mode must be "debug" or "release".');
  }

  this.platforms = argv._.slice(2);

  if(this.platforms.length < 1) {
    this.ionic.fail('No platforms specified.');
  }
};


IonicPackageTask.prototype.loadPlugins = function() {
  var self = this;
  var parseString = require('xml2js').parseString;
  var cp = spawn("cordova", ['plugins']);

  cp.stdout.on("data", function (c) {
    self.plugins = [];

    var pluginNames = JSON.parse(c.toString().replace(/'/g, '"'));

    for(var x=0; x<pluginNames.length; x++) {
      var pluginName = pluginNames[x];

      try {
        var pluginXmlPath = path.resolve('./plugins/' + pluginNames[x] + '/plugin.xml');

        if(fs.existsSync(pluginXmlPath)) {
          var xml = fs.readFileSync(pluginXmlPath, { encoding: 'utf8' });

          parseString(xml, function (err, result) {
            if(err) {
              console.log( ('Plugin parse xml error:' + err).red );
              return;
            }

            if(result && result.plugin && result.plugin.repo && result.plugin.repo.length) {
              pluginName = result.plugin.repo[0];
            }
          });
        }
      } catch(e) {
        console.log( (pluginName + ' plugin error:' + e).red );
      }

      self.plugins.push(pluginName);
    }

  });

};


IonicPackageTask.prototype.loadAppSigning = function(callback) {
  var self = this;

  if(!self.project.get('app_id')) {
    // if its the first load we won't have an appId yet
    callback();
    return;
  }

  var privateData = new IonicStore(self.project.get('app_id'));
  var cck = privateData.get('cck');
  if(!cck) {
    callback();
    return;
  }

  var options = {
    url: self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + self.project.get('app_id') + '/signing',
    headers: {
      cookie: self.jar.cookies.map(function (c) {
        return c.name + "=" + encodeURIComponent(c.value);
      }).join("; "),
      cck: cck
    }
  };

  request(options, function(err, response, body) {
    if(!err && response.statusCode == 200) {

      try {
        self.signing = JSON.parse(body);

        if(!self.signing) {
          self.ionic.fail("Invalid app signing information");
        }

      } catch(e) {
        self.ionic.fail("Error parsing app signing: " + e);
      }

    }

    callback();
  });
};


IonicPackageTask.prototype.packagePlatforms = function(platforms) {
  var self = this;

  prompt.override = argv;
  prompt.start();

  var promptProperties = self.buildPromptProperties(platforms);

  prompt.get({properties: promptProperties}, function (err, promptResult) {
    if(err) {
      self.ionic.fail('Error packaging: ' + err);
    }

    self.loadPlugins();

    var upload = new IonicUploadTask();
    upload.run(self.ionic, function() {
      for(var x=0; x<platforms.length; x++) {
        var form = self.buildPostRequest(platforms[x], promptProperties, promptResult);
        self.submitPostRequest(form, platforms[x]);
      }
    });

  });
};


IonicPackageTask.prototype.buildPromptProperties = function(platforms) {
  // Just prompt for some build properties
  var promptProperties = {};

  for(var x=0; x<platforms.length; x++) {

    if(platforms[x] == 'android') {

      // Android debug doesn't require anything
      if(this.mode == 'release') {

        promptProperties.android_keystore_file = {
          description: 'Android Keystore File (.keystore)',
          message: 'Please provide a local path to your release keystore file (eg. release.keystore)',
          required: true,
          conform: fileExists,
          isFile: true
        };

        promptProperties.android_keystore_alias = {
          description: 'Keystore Alias',
          message: 'Alias of the Keystore',
          required: true
        };

        promptProperties.android_keystore_password = {
          description: 'Keystore Password',
          message: 'Password of the Keystore',
          hidden: true,
          required: true
        };

        promptProperties.android_key_password = {
          description: 'Key Password (optional)',
          message: 'Password for Key (usually same as Keystore Password and if left blank it will use it)',
          hidden: true
        };
      }

    } else if(platforms[x] == 'ios') {
      // iOS
      promptProperties.ios_certificate_file = {
        description: 'iOS Certificate File (.p12)',
        message: 'Please provide a local path to your iOS certificate file (eg. cert.p12)',
        required: true,
        conform: fileExists,
        isFile: true
      };

      promptProperties.ios_certificate_password = {
        description: 'Certificate Password',
        message: 'Password of the Certificate',
        hidden: true,
        required: true
      };

      promptProperties.ios_profile_file = {
        description: 'iOS Mobile Provisioning Profile (.mobileprovision)',
        message: 'Please provide a local path to your iOS Mobile Provisioning Profile (eg. my.mobileprovision)',
        required: true,
        conform: fileExists,
        isFile: true
      };

    }

  }

  // Don't prompt for properties we already have stored on the server
  if(this.signing){
    for (var propertyName in promptProperties) {
      if(this.signing['is_valid_' + propertyName]) {
        delete promptProperties[propertyName];
      }
    }
  }

  return promptProperties;
};


IonicPackageTask.prototype.buildPostRequest = function(platform, promptProperties, promptResult) {
  var form = new FormData();

  form.append('email', this.project.get('email'));
  form.append('name', this.project.get('name'));
  form.append('platform', platform);
  form.append('build_mode', this.mode);
  form.append('csrfmiddlewaretoken', this.jar.cookies[0].value);

  for (var i = 0; i < this.plugins.length; i++) {
    form.append('plugin_' + i, this.plugins[i]);
  }

  for(var propertyName in promptResult) {
    var promptValue = promptResult[propertyName];
    if( !promptValue ) continue;

    if(promptProperties[propertyName].isFile) {
      try {
        promptValue = promptValue.replace(/\\ /g, ' ').trim();
        form.append(propertyName, fs.createReadStream( path.resolve(promptValue) ) );
      } catch(e) {
        this.ionic.fail("Error loading " + path.resolve(promptValue.trim()));
      }
    } else {
      form.append(propertyName, promptValue);
    }
  }

  var configFilePath = path.resolve('./config.xml');
  if(fs.existsSync(configFilePath)){
    var xmlString = fs.readFileSync(configFilePath, { encoding: 'utf8' });
    form.append('config_file', xmlString);
  }

  return form;
};


IonicPackageTask.prototype.submitPostRequest = function(form, platform) {
  var self = this;
  var params = parseUrl(self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + self.project.get('app_id') + '/package');

  var privateData = new IonicStore(this.project.get('app_id'));

  console.log( (platform + ' package building...').bold.grey );

  form.submit({
    protocol: params.protocol,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    headers: form.getHeaders({
      cookie: self.jar.cookies.map(function (c) {
        return c.name + "=" + encodeURIComponent(c.value);
      }).join("; "),
      cck: privateData.get('cck')
    })
  },
  function(err, response) {
    if(err) {
      self.ionic.fail("Error packaging " + platform + ": " + err);
    }

    response.setEncoding('utf8');
    response.on("data", function(data) {
      try {
        var d = JSON.parse(data);

        if(d.errors && d.errors.length) {
          for (var j = 0; j < d.errors.length; j++) {
            process.stderr.write(d.errors[j] + '\n');
          }
        } else if(d.build_status_url) {
          process.stderr.write('.');
          setTimeout(function(){
            var requestOptions = {
              url: d.build_status_url,
              headers: {
                cookie: self.jar.cookies.map(function (c) {
                  return c.name + "=" + encodeURIComponent(c.value);
                }).join("; ")
              }
            };
            pingBuildStatus(self.ionic, requestOptions, platform, 1);
          }, 5000);
        }

        if(d.cck) {
          var privateData = new IonicStore(self.project.get('app_id'));
          privateData.set('cck', d.cck);
          privateData.save();
        }

        if(d.app_id) {
          self.project.set('app_id', d.app_id);
        }
        if(d.email) {
          self.project.set('email', d.email);
        }
        if(d.name) {
          self.project.set('name', d.name);
        }
        self.project.save();

      } catch(e) {
        self.ionic.fail('Error submitPostRequest: ' + e);
      }
    });

  });
};


function pingBuildStatus(ionic, requestOptions, platform, attempt) {
  process.stderr.clearLine();
  process.stderr.cursorTo(0);

  for(var x=0; x<attempt; x++) {
    process.stderr.write('.');
  }

  request(requestOptions, function(err, response, body) {
    if(err) {
      ionic.fail("\nError pinging build status: " + err);
    }

    try {
      var d = JSON.parse(body);

      if(d.errors && d.errors.length) {
        for(var x=0; x<d.errors.length; x++) {
          console.log( ('\n' + d.errors[x]).bold.red );
        }
        return;
      }

      if(d.message) {
        console.log( ('\n' + d.message).bold.red );
      }

      // STATUS_INITIALIZED = 0
      // STATUS_QUEUED      = 1
      // STATUS_BUILDING    = 2
      // STATUS_SUCCESS     = 3
      // STATUS_FAILED      = 4

      if(d.status >= 0 && d.status < 3) {
        // still queued/building
        attempt++;

        if(attempt > 60) {
          ionic.fail("\nUnable to receive build status");
        }

        setTimeout(function(){
          pingBuildStatus(ionic, requestOptions, platform, attempt);
        }, 5000);

      } else if(d.status == 4) {
        console.log("Use 'ionic package --clear-signing' to clear app signing and credential data if needed.".bold.red);
        ionic.fail("Build failed");
      } else if(d.status == 3) {
        downloadBuildPackage(platform, d);
      } else {
        ionic.fail("\nError receiving build status");
      }

    } catch(e) {
      ionic.fail("\nError pinging build status: " + e);
    }

  });
}


function downloadBuildPackage(platform, data) {
  console.log( ('\n\n' + platform + ' build complete, downloading package...').bold.grey );

  var dirPath = path.resolve('./packages');
  var filePath = path.resolve(dirPath + '/' + data.package_filename);

  if(!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  var params = parseUrl(data.package_url);

  var file = fs.createWriteStream(filePath);
  var request = http.get({hostname: params.hostname, path: params.path, port: params.port, protocol: 'http:'}, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(function(){
        console.log( ('Saved ' + platform + ' package: ' + filePath + '\n').bold.green );
      });
    });
  }).on('response', function(res){

    var ProgressBar = require('progress');
    var bar = new ProgressBar('[:bar]  :percent  :etas', {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: parseInt(res.headers['content-length'], 10)
    });

    res.on('data', function (chunk) {
      bar.tick(chunk.length);
    });

    res.on('end', function () {
      console.log('\n');
    });

  }).on('error', function(err) {
    fs.unlink(filePath);
    console.error( (err).red );
  });
}


function fileExists(filePath) {
  // check if a file exists with a relative path or absolute path
  filePath = filePath.replace(/\\ /g, ' ').trim();
  return fs.existsSync(path.resolve(filePath));
}

exports.IonicPackageTask = IonicPackageTask;
