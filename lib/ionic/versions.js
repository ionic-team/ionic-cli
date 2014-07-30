var fs = require('fs'),
  path = require('path'),
  parseUrl = require('url').parse,
  argv = require('optimist').argv,
  FormData = require('form-data'),
  IonicProject = require('./project'),
  IonicTask = require('./task').IonicTask,
  IonicStats = require('./stats').IonicStats,
  IonicLoginTask = require('./login').IonicLoginTask,
  request = require('request'),
  Q = require('q');

var IonicVersionsTask = function() {};

IonicVersionsTask.prototype = new IonicTask();

IonicVersionsTask.prototype.run = function(ionic) {
  var self = this;

  self.ionic = ionic;

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    self.jar = jar;
    IonicStats.t('versions', {});

    var project = IonicProject.load();

    if (!project.get('app_id')) {
      console.log("No versions uploaded!".bold.red);
      return false;
    }
    
    var form = new FormData();
    form.append('csrfmiddlewaretoken', jar.cookies[0].value);

    var url = ionic.IONIC_DASH + ionic.IONIC_API + 'app/' + project.get('app_id') + '/versions';
    var params = parseUrl(url);

    form.submit({
        protocol: params.protocol,
        hostname: params.hostname,
        port: params.port,
        path: params.path,
        headers: form.getHeaders({
          cookie: self.jar.cookies.map(function (c) {
            return c.name + "=" + encodeURIComponent(c.value);
          }).join("; ")
        })
      },
      function (err, response) {
        if (err) {
          return ionic.fail('Error logging in: ' + err);
        }

        response.setEncoding('utf8');
        response.on("data", function(data) {
          try {
            var d = JSON.parse(data);
            if (d.errors && d.errors.length) {
              for (var j = 0; j < d.errors.length; j++) {
                console.log((d.errors[j]).bold.error);
              }
              return ionic.fail('Unable to fetch versions list');
            }

            for (var j = 0; j < d.length; j++) {
              var active = (d[j].active) ? '*' : ' ';
              var uuid = (d[j].active) ? d[j].uuid.substring(0,8).green : d[j].uuid.substring(0,8);
              var note = d[j].note.substring(0,25);

              console.log([active, uuid, note].join(' '));
            }
          } catch(parseEx) {
            return ionic.fail('Error response: ' + parseEx);
          }
        });
      })
    });
};

exports.IonicVersionsTask = IonicVersionsTask;
