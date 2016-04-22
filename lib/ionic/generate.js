var path = require('path');
var Task = require('./task').Task;
var ionicAppLib = require('ionic-app-lib');
var Utils = ionicAppLib.utils;
var log = ionicAppLib.logging.logger;
var Project =  ionicAppLib.project;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  try {
    if (!argv.list && argv._.length < 3) {

      // TODO should have a mechanism for printing usage on invalid tasks
      Utils.fail('Invalid arguments. Usage: ionic generate <generator> <name>');
    }

    if (!argv.v2) {
      return Utils.fail('Generators are only available for Ionic 2 projects');
    }

    var project;
    try {
      project = Project.load(process.cwd());
    } catch (err) {
      return Utils.fail(err);
    }

    var generator = argv._[1];
    var name = argv._[2]; // TODO support multiple names
    var isTS = project.get('typescript') || argv.ts;

    var ionicModule = loadToolingModule();

    if (argv.list) {
      ionicModule.Generate.printAvailableGenerators();
      return;
    }

    var promise;
    try {
      promise = ionicModule.generate({ appDirectory: process.cwd(), generator: generator, name: name, isTS: isTS });
    } catch (err) {
      if (err.message.indexOf('no generator available') !== -1) {
        log.error(err.message);
        ionicModule.Generate.printAvailableGenerators();
        return;
      }
      return Utils.fail(err);
    }
    return promise;

  } catch (err) {
    Utils.fail('There was an error generating your item:', err);
  }
};

function loadToolingModule() {

  // First try node_modules/ionic-angular/tooling
  var toolingPath;
  var ionicModule;

  try {
    toolingPath = path.join(process.cwd(), 'node_modules', 'ionic-angular', 'tooling');
    ionicModule = require(toolingPath);
  } catch (err) {

    // if this isn't found, that's fine, check for ionic-framework
    if (err.code !== 'MODULE_NOT_FOUND') {
      Utils.fail('Error when requiring ' + toolingPath + ':\n  ' + err);
    }
  }

  // Then try node_modules/ionic-framework/tooling
  if (!ionicModule) {
    try {
      ionicModule = require(path.join(process.cwd(), 'node_modules', 'ionic-framework', 'tooling'));
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        Utils.fail('No ionic-angular package found, do you have Ionic installed?');
      }
    }
  }

  // Last, try node_modules/ionic-framework (beta.1 and below)
  if (!ionicModule) {
    try {
      ionicModule = require(path.join(process.cwd(), 'node_modules', 'ionic-framework'));
    } catch (err) {
      Utils.fail(err);
    }
  }
  return ionicModule;
}

exports.IonicTask = IonicTask;
