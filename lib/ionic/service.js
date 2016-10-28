'use strict';

var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;
var _ = require('underscore');
var extend = require('../utils/extend');
var bower = require('../utils/bower');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var fail = IonicAppLib.utils.fail;

var settings = {
  title: 'service add',
  name: 'service',
  summary: 'Add an Ionic service package and install any required plugins',
  args: {
    '[options]': '',
    '<SPEC>': 'Can be a service name or a git url'
  },
  isProjectTask: true
};

function readIonicProjectJson() {
  var ionicProjectFile = path.join(process.cwd(), 'ionic.project');
  var ionicProjectJson = null;
  try {
    var content = fs.readFileSync(ionicProjectFile, 'utf8');
    ionicProjectJson = JSON.parse(content);
  } catch (ex) {
    throw ex;
  }

  return ionicProjectJson;
}

function addServiceToIonicJson(serviceName) {
  var ionicProjectFile = path.join(process.cwd(), 'ionic.project');

  try {
    var ionicProjectJson = readIonicProjectJson() || {};

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
    fail('Failed to update the ionic.project settings for the service', 'service');
  }
}

function installBowerComponent(serviceName) {
  var bowerInstallCommand = 'bower link ionic-service-' + serviceName;

  try {
    var result = execSync(bowerInstallCommand);

    if (result.code !== 0) {
      return addServiceToIonicJson(serviceName);
    }
  } catch (e) {} // eslint-disable-line no-empty

  // Error happened, report it.
  var errorMessage = chalk.bold('Failed to find the service "') + serviceName.verbose +
    chalk.bold('".\nAre you sure it exists?');
  fail(errorMessage, 'service');
}

function uninstallBowerComponent(serviceName) {
  var bowerUninstallCommand = 'bower unlink ionic-service-' + serviceName;

  try {
    var result = execSync(bowerUninstallCommand);

    if (result.code !== 0) {
      return;
    }
  } catch (e) {} // eslint-disable-line no-empty

  var errorMessage = chalk.bold('Failed to find the service "') + serviceName.verbose +
    chalk.bold('".\nAre you sure it exists?');
  fail(errorMessage, 'service');
}

function getBowerComponentsLocation() {
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
}

function getBowerJson(directory, serviceName) {
  var bowerJsonLocation = path.join(process.cwd(), directory, 'ionic-service-' + serviceName, 'ionic-plugins.json');
  var packageBowerJson = require(bowerJsonLocation);
  return packageBowerJson;
}

function installBowerPlugins(directory, serviceName) {
  var packageBowerJson = getBowerJson(directory, serviceName);

  _.each(packageBowerJson.plugins, function(plugin) {
    log.info('Installing cordova plugin - ' + plugin.name + ' (' + plugin.id + ')');
    var installPluginCmd = 'ionic plugin add ' + plugin.uri;
    log.info(installPluginCmd);

    try {
      var pluginInstallResult = execSync(installPluginCmd);

      if (pluginInstallResult.code === 0) {
        return;
      }
    } catch (e) {} // eslint-disable-line no-empty

    var errorMessage = chalk.bold('Failed to find the plugin "') + plugin.name.verbose + chalk.bold('".');
    fail(errorMessage, 'service');
  });
}

function uninstallBowerPlugins(bowerJson) {
  _.each(bowerJson.plugins, function(plugin) {
    log.info('Uninstalling cordova plugin -  ' + plugin.name);
    var uninstallPluginCmd = 'ionic plugin rm ' + plugin.id;
    log.info(uninstallPluginCmd);

    try {
      var pluginRemoveResult = execSync(uninstallPluginCmd);

      if (pluginRemoveResult.code === 0) {
        return;
      }
    } catch (e) {} // eslint-disable-line no-empty

    var errorMessage = chalk.bold('Failed to find the plugin to remove "') + plugin.name.verbose + chalk.bold('".');
    fail(errorMessage, 'service');
  });
}

function addService(serviceName) {
  installBowerComponent(serviceName);

  var directory = getBowerComponentsLocation();

  log.info('Checking for any plugins required by service package');

  installBowerPlugins(directory, serviceName);
  log.info('ionic service add completed');
}

function removeService(serviceName) {
  var directory = getBowerComponentsLocation();
  var packageBowerJson = this.getBowerJson(directory, serviceName);

  uninstallBowerComponent(serviceName);

  uninstallBowerPlugins(packageBowerJson);
}

// Need to look at bower.json of package just installed and look for any cordova plugins required
// Check the directory in the projects `.bowerrc` file
// Then go to /path/to/bower/components/<ionic-service-serviceName>/ionic-plugins.json - 'plugins'
// For each plugins - call 'ionic add plugin <current-required-plugin>'
function run(ionic, argv) {

  // This command will be deprecated in the future.
  var deprecationMsg = 'This command has been ' + chalk.red('deprecated') + '.  All ' +
   'resources are currently available in NPM and we recommend that you use NPM to manage these.\n' +
   'More information is available here: https://github.com/driftyco/ionic-cli/wiki/Migrating-to-NPM-from-bower\n';
  log.info(chalk.bold(deprecationMsg));

  if (!bower.checkForBower()) {
    fail(bower.installMessage, 'service');
    return;
  }

  var action = argv._[1];
  var serviceName = argv._[2];

  try {
    switch (action) {
    case 'add':
      addService(serviceName);
      break;
    case 'remove':
      removeService(serviceName);
      break;
    }
  } catch (error) {
    var errorMessage = error.message ? error.message : error;
    fail(errorMessage, 'service');
  }
}

module.exports = extend(settings, {
  readIonicProjectJson: readIonicProjectJson,
  addServiceToIonicJson: addServiceToIonicJson,
  installBowerComponent: installBowerComponent,
  uninstallBowerComponent: uninstallBowerComponent,
  getBowerComponentsLocation: getBowerComponentsLocation,
  getBowerJson: getBowerJson,
  installBowerPlugins: installBowerPlugins,
  uninstallBowerPlugins: uninstallBowerPlugins,
  addService: addService,
  removeService: removeService,
  run: run
});
