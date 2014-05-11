var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    archiver = require('archiver'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats,
    IonicLoginTask = require('./login').IonicLoginTask,
    Q = require('q');

var IonicUploadTask = function() {
}

IonicUploadTask.HELP_LINE = 'Upload an Ionic project to the Ionic Platform (requires login)';

IonicUploadTask.prototype = new IonicTask();

IonicUploadTask.prototype.run = function(ionic, callback) {
  var project = IonicProject.load();
  var q = Q.defer();

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
      if(project.get('app_id')) {
        console.log('Uploading app (id: ' + project.get('app_id') + ')');
      } else {
        console.log('Uploading app.');
      }

      var form = new FormData();
      form.append('name', project.get('name'));
      form.append('csrfmiddlewaretoken', jar.cookies[0].value);
      form.append('app_file', fs.createReadStream(path.resolve('www.zip')), {filename: 'www.zip', contentType: 'application/zip'});
      // form.append('app_file', zip.toBuffer(), {filename: 'www.zip', contentType: 'application/zip'});

      var url = ionic.IONIC_DASH + 'projects/' + project.get('app_id');
      var params = parseUrl(url);

      form.submit({
        hostname: params.hostname,
        port: params.port,
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

        if(response.statusCode == 302) {
          if(response.headers.location.indexOf('login?next=') >= 0) {
            console.error('Session expired. Please log in again and run this command again.');
            q.reject('not_logged_in');
            return;
          }
          console.log('Done!'.info.bold);
        
          var redirectPath = parseUrl(response.headers.location);
          project.set('app_id', redirectPath.pathname.match(/^\/projects\/(\w+)\/?$/)[1]);
          project.save();

          if(callback) {
            callback();
          };
        } else if(response.statusCode === 200) {
          console.log('Got response', response.statusCode);
          callback && callback();
        } else {
          if(response.headers['content-type'] == 'application/json') {
            response.on('data', function(chunk) {
              console.log(String(chunk));
            });
          }
          console.error('Unable to upload. HTTP response:', response.statusCode);
          q.reject(response);
        }

        q.resolve(callback);
      });
    });
  });

  q.promise.then(function(callback) {
    // Exit if there was no callback
    if(!callback) {
      process.exit(0);
    }
  }, function(err) {
    process.exit(1);
  });
};

exports.IonicUploadTask = IonicUploadTask;
