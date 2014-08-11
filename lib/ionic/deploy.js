var fs = require('fs'),
  path = require('path'),
  parseUrl = require('url').parse,
  request = require('request'),
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

  if(argv._.length > 1) {
    if (argv._[1].length === 8 || argv._[1].length === 32) {
      self.inputValues['uuid'] = argv._[1];
    }
  }

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
        self.deploy(self);
      });
    } else {
      self.deploy(self);
    }
  });
};

IonicDeployTask.prototype.deploy = function(self) {
  var project = IonicProject.load();

  var url = self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + project.get('app_id') + '/deploy';

  request({
      method: 'POST',
      url: url,
      jar: self.jar,
      form: {
        uuid: self.inputValues['uuid'],
        csrfmiddlewaretoken: self.jar.cookies[0].value
      },
      headers: {
        cookie: self.jar.cookies.map(function (c) {
          return c.name + "=" + encodeURIComponent(c.value);
        }).join("; ")
      }
    },
    function (err, response, body) {
      if (err) {
        return self.ionic.fail('Error deploying version: ' + err);
      }

      try {
        var d = JSON.parse(body);
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
