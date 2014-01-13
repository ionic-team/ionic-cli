var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    request = require('request'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    Zip = require('adm-zip'),
    IonicTask = require('./task').IonicTask,
    IonicLoginTask = require('./login.js').IonicLoginTask;

var IonicUploadTask = function() {
}

IonicUploadTask.HELP_LINE = 'Upload an Ionic project.';

IonicUploadTask.prototype = new IonicTask();

IonicUploadTask.prototype.run = function(ionic) {
  var project = ionic.loadConfig();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    var zip = new Zip();
    zip.addLocalFolder('www');
    zip.writeZip('www.zip');

    var form = new FormData();
    form.append('csrfmiddlewaretoken', jar.cookies[0].value);
    // form.append('app_file', fs.createReadStream(path.resolve('www.zip')), {filename: 'www.zip'});
    form.append('app_file', zip.toBuffer(), {filename: 'www.zip', contentType: 'application/zip'});

    var url = ionic.IONIC_DASH+'projects/'+(project.app_id?project.app_id:'');
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
      if(err) {
        ionic.fail("Error uploading: " + err);
      }
      if(response.statusCode == 302) {
        var redirectPath = parseUrl(response.headers.location);
        project.app_id = redirectPath.pathname.match(/^\/projects\/(\w+)\/?$/)[1];
        ionic.saveConfig(project);
      }
    });
  });
};

exports.IonicUploadTask = IonicUploadTask;
