var fs = require('fs'),
    path = require('path'),
    request = require('request'),
    argv = require('optimist').argv,
    FormData = require('form-data');
    Zip = require('adm-zip');
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

    // var form = new FormData();

    // form.getLength(function(err,length){
      // console.log(length);
    var r = request.post({
      // method: 'POST',
      url: ionic.IONIC_DASH+'projects/'+(project.app_id?project.app_id:''),
      jar: jar,
      // headers: { 'content-length': length }
      // form: {
      //   csrfmiddlewaretoken: jar.cookies[0].value,
      //   app_file: fs.createReadStream('www.zip')        
      // }
    }, 
    function(err, response, body) {
      // fs.unlinkSync('www.zip');

      if(err) {
        ionic.fail("Error uploading: " + err);
      }

      console.log(response);
    });

    var form = r.form();
    form.append('csrfmiddlewaretoken', jar.cookies[0].value);
    form.append('app_file', fs.createReadStream(path.resolve('www.zip')), {filename: 'www.zip'});
    // form.append('app_file', zip.toBuffer(), {filename: 'www.zip'});
      // r._form = form;
    // });

    console.log('poop');
  });
  
};

exports.IonicUploadTask = IonicUploadTask;
