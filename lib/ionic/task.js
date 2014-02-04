var fs = require('fs');

var IonicTask = function() {
};

IonicTask.prototype = {
  // Prompt the user for a response
  ask: function(question, cb) {
    var response;

    process.stdout.write(question + ' ');

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    var util = require('util');

    process.stdin.on('data', function (text) {
      cb(util.inspect(text));
      process.stdin.pause();
    });
  },
  run: function(ionic) {
  }
};

exports.IonicTask = IonicTask;
