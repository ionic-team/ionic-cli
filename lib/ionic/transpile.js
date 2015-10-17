var IonicAppLib = require('ionic-app-lib'),
    Task = require('./task').Task,
    Transpile = IonicAppLib.transpile;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function run(ionic, argv) {
  var self = this;
  this.ionic = ionic;

  if (!argv._[1]) {
    // no option, so do it all
    return Transpile.compile(process.cwd(), false, function() {
      console.log('√ Compiling files complete.'.green.bold);
    })
    .then(function() {
      return Transpile.processSass(process.cwd());
    })
    .then(function() {
      return Transpile.prepareFonts(process.cwd());
    });
  } if (argv._[1] == 'code') {
    return Transpile.compile(process.cwd(), false, function() {
      console.log('√ Compiling files complete.'.green.bold);
    })
  } else if (argv._[1] == 'sass') { 
    return Transpile.processSass(process.cwd());
  } else if (argv._[1] == 'fonts') {
    return Transpile.prepareFonts(process.cwd());
  } else {

  }

};

exports.IonicTask = IonicTask;
