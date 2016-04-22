require('shelljs/global');

var path = require('path');
var exec = require('child_process').exec;

var Task = require('./task').Task;
var IonicAppLib = require('ionic-app-lib');
var ioLib = IonicAppLib.ioConfig;
var log = IonicAppLib.logging.logger;
var bower = require('./bower');

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.installBowerComponent = function installBowerComponent(componentName) {
  var bowerInstallCommand = 'bower install --save-dev ' + componentName;

  var result = exec(bowerInstallCommand);

  if (result.code !== 0) {

    // Error happened, report it.
    var errorMessage = 'Bower error, check that "'.red.bold + componentName.verbose + '"'.red.bold +
      ' exists,'.red.bold + '\nor try running "'.red.bold + bowerInstallCommand.verbose + '" for more info.'.red.bold;

    this.ionic.fail(errorMessage, 'add');
  } else {
    log.info('Bower component installed - ' + componentName);
  }
};

IonicTask.prototype.uninstallBowerComponent = function uninstallBowerComponent(componentName) {
  var bowerUninstallCommand = 'bower uninstall --save-dev ' + componentName;

  var result = exec(bowerUninstallCommand);

  if (result.code !== 0) {
    var errorMessage = 'Failed to find the bower component "'.red.bold + componentName.verbose +
      '"'.red.bold + '.\nAre you sure it exists?'.red.bold;

    this.ionic.fail(errorMessage, 'add');
  } else {
    var message = 'Bower component removed - ' + componentName;
    log.info(message.red);
  }
};

IonicTask.prototype.listComponents = function listComponents() {
  try {
    var bowerJson = require(path.join(process.cwd(), 'bower.json'));
    log.info('Ions, bower components, or addons installed: ');
    for (var bowerCompIndex in bowerJson.devDependencies) {
      if ({}.hasOwnProperty.call(bowerJson.devDependencies, bowerCompIndex)) {
        log.info(bowerCompIndex.green);
      }
    }
  } catch (ex) {
    log.error('This command can only be used when in an Ionic project directory'.red.bold);
  }
};

// Need to look at bower.json of package just installed and look for any cordova plugins required
// Check the directory in the projects `.bowerrc` file
// Then go to /path/to/bower/components/<ionic-service-componentName>/ionic-plugins.json - 'plugins'
// For each plugins - call 'ionic add plugin <current-required-plugin>'
IonicTask.prototype.run = function(ionic, argv) {
  this.ionic = ionic;

  if (!bower.IonicBower.checkForBower()) {
    this.ionic.fail(bower.IonicBower.installMessage, 'add');
    return;
  }

  var action = argv._[0];
  var componentName = argv._[1];
  var ioSet = false;

  try {
    switch (action) {
    case 'add':
      ioSet = true;
      this.installBowerComponent(componentName);
      break;
    case 'remove':
    case 'rm':
      this.uninstallBowerComponent(componentName);
      break;
    case 'list':
    case 'ls':
    case '':
      this.listComponents();
      break;
    }
  } catch (error) {
    var errorMessage = error.message ? error.message : error;
    this.ionic.fail(errorMessage, 'service');
  }

  // Inject the component into our index.html, if necessary, and save the app_id
  ioLib.injectIoComponent(ioSet, componentName);
  ioLib.warnMissingData();
};

exports.IonicTask = IonicTask;
