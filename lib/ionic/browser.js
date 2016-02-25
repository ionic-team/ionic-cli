//Deprecated
var argv = Task = require('./task').Task;

var IonicTask = function() {};
IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic) {
  console.log(
    'The browser task has been deprecated.\n' +
    'Please use the Cordova Crosswalk plugin instead:\n\n' +
    'ionic platform add android\n' +
    'ionic plugin add cordova-plugin-crosswalk-webview\n'
  );
};

exports.IonicTask = IonicTask;
