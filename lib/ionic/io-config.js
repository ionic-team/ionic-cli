var IonicAppLib = require('ionic-app-lib');
var ioLib = IonicAppLib.ioConfig;
var argv = require('optimist').argv;
var IonicProject = IonicAppLib.project;

var IoConfigTask = {};

IoConfigTask.run = function(ionic) {
  var self = this;
  self.ionic = ionic;

  self.project = null;

  try {
    self.project = IonicProject.load();
  } catch (ex) {
    self.ionic.fail(ex.message);
    return;
  }

  var set = false;
  var write = false;
  var key = '';
  var val = '';

  if (argv['_'][1] === 'set' || argv['_'][1] === 'unset' || argv['_'][1] === 'build' || argv['_'][1] === 'info') {
    if (argv['_'][1] === 'build') {
      write = true;
      ioLib.writeIoConfig(false, false, true);
    } else if (argv['_'][1] === 'info') {
      write = true;
      ioLib.listConfig();
    } else {
      if (argv['_'][1] === 'set') {
        set = true;
      }
      if (argv['_'][2]) {
        key = argv['_'][2];
        if (argv['_'][3] && set) {
          val = argv['_'][3];
        }
      } else {
        self.ionic.fail("Invalid syntax, use 'ionic config <command> key value'");
      }
    }
  } else {
    self.ionic.fail("Invalid command, must use 'set', 'unset', 'build', or 'info'");
  }
  if (!write) {
    ioLib.writeIoConfig(key, val, set);
  }
};

module.exports = IoConfigTask;
