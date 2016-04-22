require('shelljs/global');

var Task = require('./task').Task;
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var _ = require('underscore');
var bower = require('./bower');
var log = require('ionic-app-lib').logging.logger;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.readIonicProjectJson = function readIonicProjectJson() {
  var ionicProjectFile = path.join(process.cwd(), 'ionic.project');
  var ionicProjectJson = null;
  try {
    var content = fs.readFileSync(ionicProjectFile, 'utf8');
    ionicProjectJson = JSON.parse(content);
  } catch (ex) {
    throw ex;
  }

  return ionicProjectJson;
};

IonicTask.prototype.addServiceToIonicJson = function addServiceToIonicJson(serviceName) {
  var ionicProjectFile = path.join(process.cwd(), 'ionic.project');

  try {
    var ionicProjectJson = this.readIonicProjectJson() || {};

    if (!ionicProjectJson.services) {
      ionicProjectJson.services = [];
    }

    var existingProject = _.findWhere(ionicProjectJson.services, { name: serviceName });
    if (typeof existingProject != 'undefined') {
      return;
    }

    ionicProjectJson.services.push({ name: serviceName });
    fs.writeFileSync(ionicProjectFile, JSON.stringify(ionicProjectJson, null, 2), 'utf8');

  } catch (ex) {
    this.ionic.fail('Failed to update the ionic.project settings for the service', 'service');
  }
};

IonicTask.prototype.installBowerComponent = function installBowerComponent(serviceName) {
  var bowerInstallCommand = 'bower link ionic-service-' + serviceName;
  var result = exec(bowerInstallCommand);

  if (result.code !== 0) {

    // Error happened, report it.
    var errorMessage = 'Failed to find the service "'.bold + serviceName.verbose +
      '"'.bold + '.\nAre you sure it exists?'.bold;
    this.ionic.fail(errorMessage, 'service');
  } else {
    this.addServiceToIonicJson(serviceName);
  }
};

IonicTask.prototype.uninstallBowerComponent = function uninstallBowerComponent(serviceName) {
  var bowerUninstallCommand = 'bower unlink ionic-service-' + serviceName;

  var result = exec(bowerUninstallCommand);

  if (result.code !== 0) {
    var errorMessage = 'Failed to find the service "'.bold + serviceName.verbose +
      '"'.bold + '.\nAre you sure it exists?'.bold;
    this.ionic.fail(errorMessage, 'service');
  }
};

IonicTask.prototype.getBowerComponentsLocation = function getBowerComponentsLocation() {
  var bowerRcFileLocation = path.join(process.cwd(), '.bowerrc');
  var bowerRc = null;

  try {
    var content = fs.readFileSync(bowerRcFileLocation, 'utf8');
    bowerRc = JSON.parse(content);
  } catch (ex) {
    throw ex;
  }

  var directory = 'www/lib'; // Default directory

  if (bowerRc && bowerRc.directory) {
    directory = bowerRc.directory;
  }

  return directory;
};

IonicTask.prototype.getBowerJson = function getBowerJson(directory, serviceName) {
  var bowerJsonLocation = path.join(process.cwd(), directory, 'ionic-service-' + serviceName, 'ionic-plugins.json');
  var packageBowerJson = require(bowerJsonLocation);
  return packageBowerJson;
};

IonicTask.prototype.installBowerPlugins = function installBowerPlugins(directory, serviceName) {
  var packageBowerJson = this.getBowerJson(directory, serviceName);

  _.each(packageBowerJson.plugins, function(plugin) {
    log.info('Installing cordova plugin - ' + plugin.name + ' (' + plugin.id + ')');
    var installPluginCmd = 'ionic plugin add ' + plugin.uri;
    log.info(installPluginCmd);
    var pluginInstallResult = exec(installPluginCmd);

    if (pluginInstallResult.code !== 0) {
      var errorMessage = 'Failed to find the plugin "'.bold + plugin.name.verbose + '"'.bold + '.'.bold;
      this.ionic.fail(errorMessage, 'service');
    }
  });
};

IonicTask.prototype.uninstallBowerPlugins = function uninstallBowerPlugins(bowerJson) {
  _.each(bowerJson.plugins, function(plugin) {
    log.info('Uninstalling cordova plugin -  ' + plugin.name);
    var uninstallPluginCmd = 'ionic plugin rm ' + plugin.id;
    log.info(uninstallPluginCmd);
    var pluginRemoveResult = exec(uninstallPluginCmd);

    if (pluginRemoveResult.code !== 0) {
      var errorMessage = 'Failed to find the plugin to remove "'.bold + plugin.name.verbose + '"'.bold + '.'.bold;
      this.ionic.fail(errorMessage, 'service');
    }
  });
};

IonicTask.prototype.addService = function addService(serviceName) {
  this.installBowerComponent(serviceName);

  var directory = this.getBowerComponentsLocation();

  log.info('Checking for any plugins required by service package');

  this.installBowerPlugins(directory, serviceName);
  log.info('ionic service add completed');
};

IonicTask.prototype.removeService = function removeService(serviceName) {
  var directory = this.getBowerComponentsLocation();
  var packageBowerJson = this.getBowerJson(directory, serviceName);

  this.uninstallBowerComponent(serviceName);

  this.uninstallBowerPlugins(packageBowerJson);
};

IonicTask.prototype.listServices = function listServices() {
};

// Need to look at bower.json of package just installed and look for any cordova plugins required
// Check the directory in the projects `.bowerrc` file
// Then go to /path/to/bower/components/<ionic-service-serviceName>/ionic-plugins.json - 'plugins'
// For each plugins - call 'ionic add plugin <current-required-plugin>'
IonicTask.prototype.run = function run(ionic, argv) {
  this.ionic = ionic;

  if (!bower.IonicBower.checkForBower()) {
    this.ionic.fail(bower.IonicBower.installMessage, 'service');
    return;
  }

  var action = argv._[1];
  var serviceName = argv._[2];

  try {
    switch (action) {
    case 'add':
      this.addService(serviceName);
      break;
    case 'remove':
      this.removeService(serviceName);
      break;
    case 'list':
      this.listServices();
      break;
    }
  } catch (error) {
    var errorMessage = error.message ? error.message : error;
    this.ionic.fail(errorMessage, 'service');
  }
};

exports.IonicTask = IonicTask;
