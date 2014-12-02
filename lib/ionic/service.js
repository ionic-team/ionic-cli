var Task = require('./task').Task,
    IonicCordova = require('./cordova').IonicTask,
    argv = require('optimist').argv,
    shelljs = require('shelljs'),
    execSync = require('execSync'),
    fs = require('fs'),
    _ = require('underscore');

var IonicTask = function() {};

//Hack to read in .bowerrc as JSON file
// console.log('asdasdf    -   ', require.extensions[".json"]);
// require.extensions['.bowerrc'] = require.extensions[".json"]

IonicTask.prototype = new Task();

IonicTask.prototype.installBowerComponent = function installBowerComponent(serviceName) {
  // console.log('We are here now.');
  var bowerInstallCommand = 'bower link ionic-service-' + serviceName;

  // var bowerInstallCommand = 'bower install ionic-service-' + serviceName;

  // console.log(bowerInstallCommand);
  var result = execSync.exec(bowerInstallCommand);
  // console.log('Finished installing bower package - result: ', result);

  if(result.code != 0) {
    //Error happened, report it.
    var errorMessage = 'Failed to find the service "'.error.bold + serviceName.verbose + '"'.error.bold + '.\nAre you sure it exists?'.error.bold;
    console.log(errorMessage);
  } else {
    console.log('Installed Ionic service',  serviceName);
  }
}

IonicTask.prototype.uninstallBowerComponent = function uninstallBowerComponent(serviceName) {
  var bowerUninstallCommand = 'bower unlink ionic-service-' + serviceName;

  var result = execSync.exec(bowerUninstallCommand);

  if(result.code != 0) {
    var errorMessage = 'Failed to find the service "'.error.bold + serviceName.verbose + '"'.error.bold + '.\nAre you sure it exists?'.error.bold;
    console.log(errorMessage);
  } else {
    console.log('Uninstalled Ionic service', serviceName);
  }
}

IonicTask.prototype.getBowerComponentsLocation = function getBowerComponentsLocation() {
  var bowerRcFileLocation = process.cwd() + '/.bowerrc';
  // console.log('location bowerrc: ' , bowerRcFileLocation)
  var bowerRc = null;

  try {
    var content = fs.readFileSync(bowerRcFileLocation, "utf8");
    bowerRc = JSON.parse(content);
    // console.log('bowerRc contents: ', bowerRc)
  } catch (ex) {
    //TODO: Handle error or die silently?
  }

  var directory = 'www/lib'; //Default directory

  if(bowerRc && bowerRc.directory) {
    directory = bowerRc.directory;
  }

  return directory;
}

IonicTask.prototype.getBowerJson = function getBowerJson(directory, serviceName) {
  var bowerJsonLocation = process.cwd() + '/' + directory + '/ionic-service-' + serviceName + '/bower.json';
  var packageBowerJson = require(bowerJsonLocation);
  return packageBowerJson;
}

IonicTask.prototype.installBowerPlugins = function (directory, serviceName) {
  // var bowerJsonLocation = process.cwd() + '/' + directory + '/ionic-service-' + serviceName + '/bower.json';
  // var packageBowerJson = require(bowerJsonLocation);
  var packageBowerJson = this.getBowerJson(directory, serviceName);

  // console.log('bowerjson = ', packageBowerJson.plugins);
  // console.log('ionic - ', IonicCordova);
  _.each(packageBowerJson.plugins, function(plugin) {
    // var ic = new IonicCordova();
    // ic.run('ionic plugin add ' + plugin);
    console.log('Installing cordova plugin - ' + plugin.name + ' (' + plugin.id + ')');
    var installPluginCmd = 'ionic plugin add ' + plugin.uri;
    console.log(installPluginCmd);
    var pluginInstallResult = execSync.exec(installPluginCmd);

    if(pluginInstallResult.code != 0) {
      var errorMessage = 'Failed to find the plugin "'.error.bold + plugin.name.verbose + '"'.error.bold + '.'.error.bold;
      console.log(errorMessage);
    }
    // console.log(pluginInstallResult);
  })
}

IonicTask.prototype.uninstallBowerPlugins = function uninstallBowerPlugins(bowerJson) {
  _.each(bowerJson.plugins, function(plugin) {
    console.log('Uninstalling cordova plugin -  ' + plugin.name);
    var uninstallPluginCmd = 'ionic plugin rm ' + plugin.id;
    console.log(uninstallPluginCmd);
    var pluginRemoveResult = execSync.exec(uninstallPluginCmd)

    if(pluginRemoveResult.code != 0) {
      var errorMessage = 'Failed to find the plugin to remove "'.error.bold + plugin.name.verbose + '"'.error.bold + '.'.error.bold;
      console.log(errorMessage);
    }
  })
}

IonicTask.prototype.addService = function addService(serviceName) {
  this.installBowerComponent(serviceName);

  var directory = this.getBowerComponentsLocation();
  // console.log('Directory we are searching for bower.json - ', directory);

  console.log('Checking for any plugins required by service package');

  this.installBowerPlugins(directory, serviceName);
  console.log('ionic service add completed');
}

IonicTask.prototype.removeService = function removeService(serviceName) {
  var directory = this.getBowerComponentsLocation();
  var packageBowerJson = this.getBowerJson(directory, serviceName);

  this.uninstallBowerComponent(serviceName);

  this.uninstallBowerPlugins(packageBowerJson);

}

IonicTask.prototype.listServices = function listServices() {
  // var directory = this.getBowerComponentsLocation();
  var bowerJson = require(process.cwd() + '/bower.json');

  console.log(bowerJson);

}

// Need to look at bower.json of package just installed and look for any cordova plugins required
// Check the directory in the projects `.bowerrc` file
// Then go to /path/to/bower/components/<ionic-service-serviceName>/bower.json - 'plugins'
// For each plugins - call 'ionic add plugin <current-required-plugin>'
IonicTask.prototype.run = function(ionic, callback) {

  var action = argv._[1]
  var serviceName = argv._[2];
  // console.log('args: ', argv._)

  try {
    switch(action) {
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
  } catch(error) {
    console.log('An error occurred : ', error);
  }

}

exports.IonicTask = IonicTask;
