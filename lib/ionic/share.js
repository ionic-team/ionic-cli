var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    ncp = require('ncp').ncp,
    path = require('path'),
    parseUrl = require('url').parse,
    shelljs = require('shelljs/global'),
    argv = require('optimist').boolean(['no-cordova', 'sass', 'list']).argv,
    Q = require('q'),
    open = require('open'),
    xml2js = require('xml2js'),
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicTemplates = require('./templates').IonicTask,
    IonicStore = require('./store').IonicStore,
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    IonicLoginTask = require('./login').IonicTask;


var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.getCsrfToken = function(jar) {
  for (var i = 0; i < jar.length; i++) {
    if (jar[i].key == 'csrftoken') {
      return jar[i].value;
    }
  }
  return '';
}

IonicTask.prototype.run = function(ionic) {
  this.ionic = ionic;
  var self = this;

  if(argv._.length < 2) {
    return this.ionic.fail('Invalid command', 'share');
  }

  try {
    project = IonicProject.load();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return
  }
  
  var email = argv._[1];
  if(email.indexOf('@') < 0) {
    return this.ionic.fail('Invalid email address', 'share');
  }

  console.log('Sharing app', project.get('app_id'), 'with', email);

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    self.jar = jar;

    var url = self.ionic.IONIC_DASH + self.ionic.IONIC_API + 'app/' + project.get('app_id') + '/share';
    var params = parseUrl(url);

    var form = new FormData();
    form.append('csrfmiddlewaretoken', self.getCsrfToken(self.jar));
    form.append('e', email);
    form.submit({
      protocol: params.protocol,
      hostname: params.hostname,
      port: params.port,
      path: params.path,
      headers: form.getHeaders({
        cookie: jar.map(function(c) {
          return c.key + "=" + encodeURIComponent(c.value);
        }).join("; ")
      })
    }, function (err, response) {
      if(err) {
        return ionic.fail('Error sharing: ' + err);
      }
      response.on("data", function(data) {
        if(err || response.statusCode !== 200) {
          console.log(body);
          return ionic.fail('Error sharing: ' + err);
        }
        console.log('An invite to view your app was sent.');
        //console.log('\n', data.toString('utf-8'));
      })
    });
    
  });

}

exports.IonicTask = IonicTask;
