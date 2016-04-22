// Deprecated
var Task = require('./task').Task;

function IonicTask() {}
IonicTask.prototype = new Task();

IonicTask.prototype.run = function run() {
  console.log(
    'The browser task has been deprecated.\n' +
    'Please use the Cordova Crosswalk plugin instead:\n\n' +
    'ionic platform add android\n' +
    'ionic plugin add cordova-plugin-crosswalk-webview\n'
  );
};

exports.IonicTask = IonicTask;
