var fs = require('fs'),
    path = require('path'),
    parseUrl = require('url').parse,
    archiver = require('archiver'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    IonicLoginTask = require('./login').IonicTask,
    Q = require('q');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, callback) {
  var project = IonicProject.load();
  var q = Q.defer();

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {
    var TEMP_FILENAME = 'www.zip';

    IonicStats.t();

    var zip = fs.createWriteStream(TEMP_FILENAME);

    var archive = archiver('zip');
    archive.pipe(zip);

    archive.bulk([
      { expand: true, cwd: 'www/', src: ['**'] }
    ]);

    archive.finalize(function(err, bytes) {
      if(err) {
        return ionic.fail("Error uploading: " + err);
      }
    });

    zip.on('close', function() {
      console.log('\nUploading app...'.bold.green);

      var form = new FormData();
      form.append('name', project.get('name'));
      form.append('csrfmiddlewaretoken', jar.cookies[0].value);
      form.append('app_file', fs.createReadStream(path.resolve(TEMP_FILENAME)), {filename: TEMP_FILENAME, contentType: 'application/zip'});

      var url = ionic.IONIC_DASH + ionic.IONIC_API + 'app/upload/' + project.get('app_id');
      var params = parseUrl(url);

      form.submit({
        protocol: params.protocol,
        hostname: params.hostname,
        port: params.port,
        path: params.path,
        headers: form.getHeaders({
          cookie: jar.cookies.map(function (c) {
            return c.name + "=" + encodeURIComponent(c.value);
          }).join("; ")
        })
      }, function(err, response) {

        rm('-f', TEMP_FILENAME);
        if(err) {
          return ionic.fail("Error uploading: " + err);
        }

        response.setEncoding('utf8');
        response.on("data", function(data) {
          try {

            if(response.statusCode == 401) {
              q.reject('not_logged_in');
              return ionic.fail('Session expired (401). Please log in and run this command again.');

            } else if(response.statusCode == 403) {
              q.reject('forbidden');
              return ionic.fail('Forbidden upload (403)');
            }

            var d = JSON.parse(data);
            if(d.errors && d.errors.length) {
              for (var j = 0; j < d.errors.length; j++) {
                console.log( (d.errors[j]).bold.error );
              }
              q.reject('upload_error');
              return ionic.fail('Unable to upload app');
            }

            if(response.statusCode == 200) {
              // Success
              project.set('app_id', d.app_id);
              project.save();
              console.log( ('Successfully uploaded (' + project.get('app_id') + ')\n').bold );

              if(callback) {
                try {
                  callback();
                } catch(callbackEx) {
                  q.reject('upload_error');
                  return ionic.fail('Error upload callback: ' + callbackEx);
                }
              }

            } else {
              q.reject('upload_error');
            }

          } catch(parseEx) {
            q.reject('upload_error');
            return ionic.fail('Error upload response: ' + parseEx);
          }
        });

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

exports.IonicTask = IonicTask;
