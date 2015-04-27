var fs = require('fs'),
    path = require('path'),
    cheerio = require('cheerio'),
    parseUrl = require('url').parse,
    archiver = require('archiver'),
    argv = require('optimist').argv,
    FormData = require('form-data'),
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    IonicLoginTask = require('./login').IonicTask,
    IonicUtils = require('./utils');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, callback) {
  var project = null;
  this.ionic = ionic;

  try {
    project = IonicProject.load();
  }catch (ex) {
    this.ionic.fail(ex.message);
    return
  }

  var self = this;

  // The note is a short, optional description for a version
  if (!self.note) {
    self.note = '';
  }

  var login = new IonicLoginTask();
  login.get(ionic, function(jar) {

    var documentRoot = project.get('documentRoot') || 'www';

    if (!fs.existsSync(path.resolve(documentRoot))) {
      return ionic.fail(documentRoot + ' directory cannot be found. Make sure the working directory is at the top level of an Ionic project.', 'upload');
    }

    var indexPath = path.join(documentRoot, 'index.html');

    if (!fs.existsSync(path.resolve(indexPath))) {
      return ionic.fail(indexPath + ' cannot be found. Make sure index.html is in your project root.', 'upload');
    }

    addCachebusters(indexPath);

    var TEMP_FILENAME = 'www.zip';

    IonicStats.t();

    var zip = fs.createWriteStream(TEMP_FILENAME);

    var archive = archiver('zip');
    archive.pipe(zip);

    archive.bulk([
      { expand: true, cwd: documentRoot, src: ['**'] }
    ]);

    archive.finalize(function(err, bytes) {
      if (err) {
        return ionic.fail("Error uploading: " + err);
      }
    });
    zip.on('close', function() {
      removeCachebusters(indexPath);

      console.log('\nUploading app...'.bold.green);

      var csrftoken = '';

      csrftoken = IonicUtils.retrieveCsrfToken(jar);

      var form = new FormData();
      form.append('name', project.get('name'));
      form.append('note', self.note);
      form.append('csrfmiddlewaretoken', csrftoken);
      form.append('app_file', fs.createReadStream(path.resolve(TEMP_FILENAME)), {filename: TEMP_FILENAME, contentType: 'application/zip'});

      var url = ionic.IONIC_DASH + ionic.IONIC_API + 'app/upload/' + project.get('app_id');
      var params = parseUrl(url);

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
      }, function(err, response) {

        rm('-f', TEMP_FILENAME);
        if (err) {
          console.log('There was an error trying to upload your app.'.red.bold);
          var errorMessage;
          if(err.code === 'ENOTFOUND' || err.code === 'EPIPE') {
            errorMessage = 'The address you are trying to reach could not be found. \n' +
            'This could be your internet connection or the server itself is having issues.';
          } else {
            errorMessage = 'The specific error message: ' + err;
          }
          return ionic.fail(errorMessage.red.bold);
        }

        response.setEncoding('utf8');

        var data = "";
        response.on('data', function(chunk){
          data += chunk;
        });

        response.on('end', function() {

          if ( response.statusCode == 401 ) {
            return ionic.fail('Session expired (401). Please log in and run this command again.');
          } else if ( response.statusCode == 403 ) {
            return ionic.fail('Forbidden upload (403)');
          } else if ( response.statusCode == 500 ) {
            return ionic.fail('Server Error (500) :(');
          } 

          try {
            var d = JSON.parse(data);
          } catch ( parseEx ) {
            // keep error msg reasonably short
            return ionic.fail('Error malformed response: ' + parseEx +
                                 '\nResponse: ' + data.substr(0, 80)); 
          }

          if ( d.errors && d.errors.length ) {
            for ( var j = 0; j < d.errors.length; j++ ) {
              console.error(d.errors[j]);
            }
            return ionic.fail('Unable to upload app');
          }

          if ( response.statusCode == 200 ) {
            // Success
            project.set('app_id', d.app_id);
            project.save();
            console.log(('Successfully uploaded (' + project.get('app_id') + ')\n').bold);
            console.log(('Share your beautiful app with someone:\n\n$ ionic share EMAIL\n').bold);
          } 

          if ( callback ) {
            try {
              callback();
            } catch ( callbackEx ) {
              return ionic.fail('Error upload callback: ' + callbackEx);
            }
          }
        });
      });
    });
  });
};

IonicTask.prototype.setNote = function(note) {
  this.note = note
};

// If your Webview's strange, and its cache is no good? Who you gonna call?
//
// Cachebusters!
function addCachebusters(indexPath) {
  var randomString = Math.floor(Math.random() * 100000);
  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml);
  var hasQuestionMark;
  $('script').each(function(i, el){
    if (typeof el.attribs.src === "undefined") return true; //continue
    hasQuestionMark = el.attribs.src.indexOf('?');
    el.attribs.src += (++hasQuestionMark ? '&' : '?') + "ionicCachebuster=" + randomString;
  });
  $('link').each(function(i, el){
    if (typeof el.attribs.href === "undefined") return true; //continue
    hasQuestionMark = el.attribs.href.indexOf('?');
    el.attribs.href += (++hasQuestionMark ? '&' : '?') + "ionicCachebuster=" + randomString;
  });
  try {
    fs.writeFileSync(indexPath, $.html());
  } catch(e) {
    console.error("Unable to append cachebusters to index.html asset urls. Err: " + err);
  }
}

function removeCachebusters(indexPath) {
  var indexHtml = fs.readFileSync(indexPath, 'utf8');
  var $ = cheerio.load(indexHtml);
  var index;
  $('script').each(function(i, el){
    if (typeof el.attribs.src === "undefined") return true; //continue
    index = hasQuestionMark = el.attribs.src.indexOf('?ionicCache');
    el.attribs.src = el.attribs.src.substring(0, ++hasQuestionMark ? index : el.attribs.src.indexOf("&ionicCache"));
  });
  $('link').each(function(i, el){
    if (typeof el.attribs.href === "undefined") return true; //continue
    index = hasQuestionMark = el.attribs.href.indexOf('?ionicCache');
    el.attribs.href = el.attribs.href.substring(0, ++hasQuestionMark ? index : el.attribs.href.indexOf("&ionicCache"));
  });
  try {
    fs.writeFileSync(indexPath, $.html());
  } catch(e) {
    console.error("Unable to remove cachebusters from index.html asset urls. Err: " + err);
  }
}

exports.IonicTask = IonicTask;
