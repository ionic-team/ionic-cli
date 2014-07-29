var fs = require('fs'),
  path = require('path'),
  parseUrl = require('url').parse,
  argv = require('optimist').argv,
  FormData = require('form-data'),
  IonicProject = require('./project'),
  IonicTask = require('./task').IonicTask,
  IonicStats = require('./stats').IonicStats,
  IonicLoginTask = require('./login').IonicLoginTask,
  IonicUploadTask = require('./upload').IonicUploadTask,
  Q = require('q');

var IonicDeployTask = function() {};

IonicDeployTask.prototype = new IonicTask();

IonicDeployTask.prototype.run = function(ionic) {
  var self = this;

  self.ionic = ionic;
  self.inputValues = {};
  self.useCmdArgs = false;
  this.getCmdLineOptions();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    self.jar = jar;
    IonicStats.t('deploy', {});

    if (!self.inputValues['uuid']) {
      // Deploying a new version
      var upload = new IonicUploadTask();

      upload.setNote(self.inputValues['note'] || '');
      upload.run(self.ionic, function() {
        self.deploy();
      });
    } else {
      self.deploy();
    }
  });
};

IonicDeployTask.prototype.deploy = function() {
  var project = IonicProject.load();
  var form = new FormData();
  form.append('csrfmiddlewaretoken', this.jar.cookies[0].value);
  form.append('uuid', this.inputValues['uuid']);

  var url = this.ionic.IONIC_DASH + this.ionic.IONIC_API + 'app/' + project.get('app_id') + '/deploy';
  var params = parseUrl(url);

  form.submit({
      protocol: params.protocol,
      hostname: params.hostname,
      port: params.port,
      path: params.path,
      headers: form.getHeaders({
        cookie: this.jar.cookies.map(function (c) {
          return c.name + "=" + encodeURIComponent(c.value);
        }).join("; ")
      })
    },
    function (err, response) {
      if (err) {
        return self.ionic.fail('Error deploying version: ' + err);
      }

      response.setEncoding('utf8');
      response.on("data", function(data) {
        try {
          var d = JSON.parse(data);
          if (d.errors && d.errors.length) {
            for (var j = 0; j < d.errors.length; j++) {
              console.log((d.errors[j]).bold.error);
            }
            return self.ionic.fail('Unable to deploy version');
          }

          console.log("Successfully deployed " + d.uuid);

        } catch (parseEx) {
          return self.ionic.fail('Error response: ' + parseEx);
        }
      })
    }
  );
};

IonicDeployTask.prototype.getCmdLineOptions = function() {
  var self = this;

  function getCmdArgValue(propertyName, shortName) {
    var value = argv[propertyName] || argv[shortName];
    if(value) {
      self.inputValues[propertyName] = value;
      self.useCmdArgs = true;
    }
  }

  getCmdArgValue('note', 'n');
  getCmdArgValue('uuid', 'u');
};

exports.IonicDeployTask = IonicDeployTask;
