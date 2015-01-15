var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats;
    Task = require('./task').Task,
    IonicLoginTask = require('./login').IonicTask;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;

  self.ionic = ionic;
  self.inputValues = {};
  self.inputFiles = {};
  self.useCmdArgs = false;

  this.getCmdLineOptions();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    self.jar = jar;

    if (argv['notify'] || argv.p) {
      // Dev wants to send a push notification
      // This will require a list of device id's somehow
    } else if (argv['ios-dev-cert'] || argv['ios-prod-cert'] || argv.d || argv.p) {
      // Dev wants to upload an ios push cert
      self.upload_cert(self);
    } else if (argv['production-mode'] || argv.l) {
      // Dev wants to switch between test/live mode
      // this will look like --live-mode=[y/n]
      // where y will put into live and n will put into dev
      self.set_production_mode(self);
    }
  
  });
};

IonicTask.prototype.set_production_mode = function(self) {
  var project = IonicProject.load();

  if (!project.get('app_id')) {
    console.log("You need to upload your app first!".bold.red);
    return false;
  }

  if (self.inputValues['production-mode'] === true) {
    console.log("You need to specify a value [y/n] to set the production mode!".bold.red);
    return false;
  }

  self.inputValues['production-mode'] = self.inputValues['production-mode'].toLowerCase();

  if (self.inputValues['production-mode'] != 'y' && self.inputValues['production-mode'] != 'n') {
    console.log("You need to specify a value [y/n] to set the production mode!".bold.red);
    return false;
  }

  var url = self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + project.get('app_id') + '/push/set-production-mode';
    var params = parseUrl(url);

    var form = new FormData();
    form.append('csrfmiddlewaretoken', self.getCsrfToken(self.jar));
    form.append('production_mode', self.inputValues['production-mode']);

    form.submit({
        protocol: params.protocol,
        hostname: params.hostname,
        port: params.port,
        path: params.path,
        headers: form.getHeaders({
          cookie: self.jar.map(function(c) {
            return c.key + "=" + encodeURIComponent(c.value);
          }).join("; ")
        })
      },
      function (err, response) {
        if (err) {
          return self.ionic.fail('Error uploading certificate: ' + err);
        }

        response.setEncoding('utf8');
        response.on("data", function(data) {
          if (err) {
            return self.ionic.fail('Error setting mode: ' + err);
          }

          try {
            var d = JSON.parse(data);
            if (d.errors && d.errors.length) {
              for (var j = 0; j < d.errors.length; j++) {
                console.log((d.errors[j]).bold.error);
              }
              return self.ionic.fail('Unable to set mode');
            }

            if (self.inputValues['production-mode'] == 'y') {
              console.log("Successfully set production mode");
            } else {
              console.log("Successfully set development mode");
            }

          } catch (parseEx) {
            return self.ionic.fail('Error response: ' + parseEx);
          }
        });
      }
    );
};

IonicTask.prototype.upload_cert = function(self) {
  var project = IonicProject.load();

  if (!project.get('app_id')) {
    console.log("You need to upload your app first!".bold.red);
    return false;
  }


  var promptProperties = {};
  var prodCert = '0';

  if (argv['ios-dev-cert']) {
    promptProperties['ios-push-cert'] = {
      name: 'ios-push-cert',
      description: 'iOS Dev Push Certificate File (.p12)'.yellow.bold,
      required: true,
      conform: fileExists,
      isFile: true
    };
  } else if (argv['ios-prod-cert']) {
    promptProperties['ios-push-cert'] = {
      name: 'ios-push-cert',
      description: 'iOS Prod Push Certificate File (.p12)'.yellow.bold,
      required: true,
      conform: fileExists,
      isFile: true
    };

    prodCert = '1';
  }

  prompt.start();

  prompt.get({properties: promptProperties}, function(err, promptResult) {
    if (err) {
      return self.ionic.fail('Error: ' + err);
    }

    var url = self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + project.get('app_id') + '/push/upload-push-cert';
    var params = parseUrl(url);

    var form = new FormData();
    form.append('csrfmiddlewaretoken', self.getCsrfToken(self.jar));

    try {
      inputFile = promptResult['ios-push-cert'].replace(/\\ /g, ' ').trim();
      form.append('ios_push_cert', fs.createReadStream( resolvePath(inputFile) ) );
    } catch(e) {
      return self.ionic.fail("Error loading " + resolvePath(inputFile));
    }

    // Set the flag for if this is a production or dev cert
    form.append('prod_cert', prodCert);

    form.submit({
        protocol: params.protocol,
        hostname: params.hostname,
        port: params.port,
        path: params.path,
        headers: form.getHeaders({
          cookie: self.jar.map(function(c) {
            return c.key + "=" + encodeURIComponent(c.value);
          }).join("; ")
        })
      },
      function (err, response) {
        if (err) {
          return self.ionic.fail('Error uploading certificate: ' + err);
        }

        response.setEncoding('utf8');
        response.on("data", function(data) {
          if (err) {
            return self.ionic.fail('Error uploading certificate: ' + err);
          }

          try {
            var d = JSON.parse(data);
            if (d.errors && d.errors.length) {
              for (var j = 0; j < d.errors.length; j++) {
                console.log((d.errors[j]).bold.error);
              }
              return self.ionic.fail('Unable to upload certificate');
            }

            console.log("Successfully uploaded certificate");

          } catch (parseEx) {
            return self.ionic.fail('Error response: ' + parseEx);
          }
        });
      }
    );
  });
}

IonicTask.prototype.getCmdLineOptions = function() {
  var self = this;

  function getCmdArgValue(propertyName, shortName) {
    var value = argv[propertyName] || argv[shortName];
    if(value) {
      self.inputValues[propertyName] = value;
      self.useCmdArgs = true;
    }
  }

  function getCmdArgFile(propertyName, shortName) {
    var value = argv[propertyName] || argv[shortName];
    if(value) {
      if(!fileExists(value)) {
        return self.ionic.fail("Unable to find file: " + argv[propertyName]);
      }
      self.inputFiles[propertyName] = value;
      self.useCmdArgs = true;
    }
  }

  getCmdArgValue('production-mode', 'l');

  getCmdArgFile('ios-push-dev-cert', 'd');
  getCmdArgFile('ios-push-prod-cert', 'p');
};

IonicTask.prototype.getCsrfToken = function(jar) {
  for (var i = 0; i < jar.length; i++) {
    if (jar[i].key == 'csrftoken') {
      return jar[i].value;
    }
  }
  return '';
}

function fileExists(filePath) {
  // check if a file exists with a relative path or absolute path
  filePath = filePath.replace(/\\ /g, ' ').trim();
  return fs.existsSync(resolvePath(filePath));
}

function resolvePath (p) {
  if (p.substr(0, 1) === '~') {
    p = process.env.HOME + p.substr(1);
  }
  return path.resolve(p);
}

exports.IonicTask = IonicTask;
