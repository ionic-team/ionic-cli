var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    archiver = require('archiver'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats,
    IonicLoginTask = require('./login').IonicLoginTask;

var IonicUploadTask = function() {
}

IonicUploadTask.HELP_LINE = 'Upload an Ionic project.';

IonicUploadTask.prototype = new IonicTask();

IonicUploadTask.prototype.run = function(ionic, callback) {
  var project = IonicProject.load();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    
    console.log('Zipping...');

    IonicStats.t('upload', {});

    var zip = fs.createWriteStream('www.zip');

    var archive = archiver('zip');
    archive.pipe(zip);

    archive.bulk([
      { expand: true, cwd: 'www/', src: ['**'] }
    ]);

    archive.finalize(function(err, bytes) {
      if(err) {
        ionic.fail("Error uploading: " + err);
      }
    });

    zip.on('close', function() {
      console.log('Done');
      console.log('Uploading...');

      var form = new FormData();
      form.append('name', project.get('name'));
      form.append('csrfmiddlewaretoken', jar.cookies[0].value);
      form.append('app_file', fs.createReadStream(path.resolve('www.zip')), {filename: 'www.zip', contentType: 'application/zip'});
      // form.append('app_file', zip.toBuffer(), {filename: 'www.zip', contentType: 'application/zip'});

      var url = ionic.IONIC_DASH+'projects/'+project.get('app_id');
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
        rm('-f', 'www.zip');
        if(err) {
          ionic.fail("Error uploading: " + err);
        }
        
        console.log('Done');

        if(response.statusCode == 302) {
          var redirectPath = parseUrl(response.headers.location);
          project.set('app_id', redirectPath.pathname.match(/^\/projects\/(\w+)\/?$/)[1]);
          project.save();

          if (callback) {
            callback();
          };
        }
      });
    });
  });
};

exports.IonicUploadTask = IonicUploadTask;
