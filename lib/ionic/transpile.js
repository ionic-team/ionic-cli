var IonicAppLib = require('ionic-app-lib'),
    Task = require('./task').Task,
    Transpile = IonicAppLib.transpile;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var self = this;
  this.ionic = ionic;

  if (argv._[1] == 'sass') { 
    console.log('This is still experimental. Not complete.'.red.bold);
    return Transpile.processSass({appDirectory: process.cwd()});
  } else if (argv._[1] == 'fonts') {
    return Transpile.prepareFonts(process.cwd());
  } else {
    return Transpile.compile(process.cwd(), false, function() {
      // console.log('√ Compiling files complete.'.green.bold);
    });
  }

};

exports.IonicTask = IonicTask;
