require('shelljs/global')

var Task = require('./task').Task,
    IonicCordova = require('./cordova').IonicTask,
    IonicStats = require('./stats').IonicStats,
    IonicIoConfig = require('./io-config'),
    // argv = require('optimist').argv,
    fs = require('fs'),
    path = require('path'),
    bower = require('./bower');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.installBowerComponent = function installBowerComponent(componentName) {
  var bowerInstallCommand = 'bower install --save-dev ' + componentName;

  var result = exec(bowerInstallCommand);

  if (result.code != 0) {
    //Error happened, report it.
    var errorMessage = 'Failed to find the bower component "'.error.bold + componentName.verbose + '"'.error.bold + '.\nAre you sure it exists?'.error.bold;
    this.ionic.fail(errorMessage, 'add');
  } else {
    var message = 'Bower component installed - ' + componentName;
    console.log(message.green)
  }
}

IonicTask.prototype.uninstallBowerComponent = function uninstallBowerComponent(componentName) {
  var bowerUninstallCommand = 'bower uninstall --save-dev ' + componentName;

  var result = exec(bowerUninstallCommand);

  if (result.code != 0) {
    var errorMessage = 'Failed to find the bower component "'.error.bold + componentName.verbose + '"'.error.bold + '.\nAre you sure it exists?'.error.bold;
    this.ionic.fail(errorMessage, 'add')
  } else {
    var message = 'Bower component removed - ' + componentName;
    console.log(message.red);
  }
}

IonicTask.prototype.listComponents = function listComponents() {
  try {
    var bowerJson = require(path.join(process.cwd(), 'bower.json'));
    console.log('Ions, bower components, or addons installed: '.info)
    for (var bowerCompIndex in bowerJson.devDependencies) {
      console.log(bowerCompIndex.green);
    }
  }catch(ex) {
    console.log('This command can only be used when in an Ionic project directory'.red.bold);
  }
}

// Need to look at bower.json of package just installed and look for any cordova plugins required
// Check the directory in the projects `.bowerrc` file
// Then go to /path/to/bower/components/<ionic-service-componentName>/ionic-plugins.json - 'plugins'
// For each plugins - call 'ionic add plugin <current-required-plugin>'
IonicTask.prototype.run = function(ionic, argv) {
  // console.log('running ', argv._)
  this.ionic = ionic;

  IonicStats.t();

  if (!bower.IonicBower.checkForBower()) {
    this.ionic.fail(bower.IonicBower.installMessage, 'add');
    return;
  }

  var action = argv._[0]
  var componentName = argv._[1];
  var ioPath = false;
  var ioName = false;
  var ioSet = false;

  try {

    // Add the default path to the component for our IO components
    switch (componentName) {
      case 'ionic-service-push':
        ioPath = 'lib/ionic-service-push/ionic-push.js';
        ioName = 'ionic.service.push';
        break;
      case 'ionic-service-deploy':
        ioPath = 'lib/ionic-service-deploy/ionic-deploy.js';
        ioName = 'ionic.service.deploy';
        break;
      case 'ionic-service-analytics':
        ioPath = 'lib/ionic-service-analytics/ionic-analytics.js';
        ioName = 'ionic.service.analytics';
        break;
      default:
        break;
    }
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
    this.ionic.fail(errorMessage, 'service')
  }

  // If it's one of our components, auto-include it in the index.
  if (ioPath) {
    IonicIoConfig.injectIoComponent(ioSet, ioPath, ioName);
  }
}

exports.IonicTask = IonicTask;
