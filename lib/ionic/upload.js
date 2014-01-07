var request = require('request'),
    argv = require('optimist').argv,
    zip = require('adm-zip');
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
    request({
      method: 'POST',
      url: ionic.IONIC_DASH+'projects/'+(project.app_id?project.app_id:''),
      jar: jar
    }, 
    function(err, response, body) {
      if(err) {
        ionic.fail("Error uploading: " + err);
      }


      console.log(response);
    });
  });
  
};

exports.IonicUploadTask = IonicUploadTask;
