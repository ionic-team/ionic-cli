var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    request = require('request'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats,
    Task = require('./task').Task,
    IonicLoginTask = require('./login').IonicTask,
    IonicUploadTask = require('./upload').IonicTask,
    IonicUtils = require('./utils');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;

  self.ionic = ionic;
  self.inputValues = {};
  self.useCmdArgs = false;

  this.getCmdLineOptions();

  ionic.IONIC_DASH = 'http://stage.apps.ionic.io';
  
  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    self.jar = jar;

    if (argv['versions'] || argv.v) {
      self.versions(self);
    } else if (argv['deploy'] || argv.d) {
      if (!self.inputValues['uuid']) {
        // Deploying a new version
        var upload = new IonicUploadTask();

        upload.setNote(self.inputValues['note'] || '');
        upload.run(self.ionic, argv, function() {
          self.deploy(self);
        });
      } else {
        self.deploy(self);
      }
    }
  });
};

IonicTask.prototype.versions = function(self) {
  var project = null;

  try {
    project = IonicProject.load();
  } catch (ex) {
    self.ionic.fail(ex.message);
    return
  }

  if (!project.get('app_id')) {
    console.log("No versions uploaded!".bold.red);
    return false;
  }

  var form = new FormData();
  form.append('csrfmiddlewaretoken', self.getCsrfToken(self.jar));

  var url = self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + project.get('app_id') + '/versions';
  var params = parseUrl(url);

  form.submit({
    protocol: params.protocol,
    hostname: params.hostname,
    port: params.port,
    path: params.path,
    headers: form.getHeaders({
      cookie: IonicUtils.transformCookies(self.jar)
    })
  },
  function (err, response) {
    if (err) {
      return self.ionic.fail('Error logging in: ' + err);
    }

    response.setEncoding('utf8');
    response.on("data", function(data) {
      try {
        var d = JSON.parse(data);
        if (d.errors && d.errors.length) {
          for (var j = 0; j < d.errors.length; j++) {
            console.log((d.errors[j]).bold.error);
          }
          return self.ionic.fail('Unable to fetch versions list');
        }

          var heading = ['    UUID   ', ' Created ', '            Note '];
          var heading_underline = ['------------', '----------', '----------------------------']

          console.log(heading.join('\t'));
          console.log(heading_underline.join('\t'));

          for (var j = 0; j < d.length; j++) {
            var active = (d[j].active) ? ' *' : '  ';
            var uuid = (d[j].active) ? d[j].uuid.substring(0,8).green : d[j].uuid.substring(0,8);
            var note = d[j].note.substring(0,25) || '\t';

            console.log([active + ' ' + uuid, ' ' + d[j].created, ' ' + note].join('\t'));
          }
        } catch(parseEx) {
          return self.ionic.fail('Error response: ' + parseEx);
        }
      });
    });
}

IonicTask.prototype.deploy = function(self) {
  var project = null;

  try {
    project = IonicProject.load();
  } catch (ex) {
    self.ionic.fail(ex.message);
    return
  }

  var url = self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + project.get('app_id') + '/deploy';

  request({
      method: 'POST',
      url: url,
      jar: self.jar,
      form: {
        uuid: self.inputValues['uuid'],
        csrfmiddlewaretoken: self.getCsrfToken(self.jar)
      },
      headers: form.getHeaders({
        cookie: jar.map(function(c) {
          return c.key + "=" + encodeURIComponent(c.value);
        }).join("; ")
      })
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

IonicTask.prototype.getCmdLineOptions = function() {
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

IonicTask.prototype.getCsrfToken = function(jar) {
  for (var i = 0; i < jar.length; i++) {
    if (jar[i].key == 'csrftoken') {
      return jar[i].value;
    }
  }
  return '';
}

exports.IonicTask = IonicTask;
