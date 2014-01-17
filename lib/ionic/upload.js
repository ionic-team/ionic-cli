var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    request = require('request'),
    argv = require('optimist').argv,
    shelljs = require('shelljs/global'),
    fstream = require('fstream'),
    tar = require('tar'),
    zlib = require('zlib'),
    FormData = require('form-data'),
    IonicTask = require('./task').IonicTask,
    IonicLoginTask = require('./login').IonicLoginTask;

var IonicUploadTask = function() {
}

IonicUploadTask.HELP_LINE = 'Upload an Ionic project.';

IonicUploadTask.prototype = new IonicTask();

IonicUploadTask.prototype.run = function(ionic, callback) {
  var project = ionic.loadConfig();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    var form = new FormData();
    form.append('csrfmiddlewaretoken', jar.cookies[0].value);


    // Using this http://stackoverflow.com/questions/15530435/node-js-zip-unzip-a-folder
    fstream.Reader({ 'path': 'www', 'type': 'Directory' }) /* Read the source directory */
      .pipe(tar.Pack()) /* Convert the directory to a .tar file */
      .pipe(zlib.Gzip()) /* Compress the .tar file */
      .pipe(fstream.Writer({ 'path': 'www.tar.gz', 'type': 'File' }));
    form.append('app_file', fs.createReadStream(path.resolve('www.tar.gz')), {filename: 'www.tar.gz', contentType: 'application/x-gzip'});
    // form.append('app_file', zip.toBuffer(), {filename: 'www.zip', contentType: 'application/zip'});

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
      //rm('-f', 'www.tar.gz');
      if(err) {
        ionic.fail("Error uploading: " + err);
      }
      if(response.statusCode == 302) {
        var redirectPath = parseUrl(response.headers.location);
        project.app_id = redirectPath.pathname.match(/^\/projects\/(\w+)\/?$/)[1];
        ionic.saveConfig(project);

        if (callback) {
          callback();
        };
      }
    });
  });
};

exports.IonicUploadTask = IonicUploadTask;
