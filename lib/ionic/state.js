// "cordovaPlatforms": [
//   "ios",
//   {
//     "android": {
//       "id": "android",
//       "locator": "https://github.com/apache/cordova-android.git"
//     }
//   }
// ],
// "cordovaPlugins": [
//   "org.apache.cordova.device",
//   "org.apache.cordova.console",
//   "com.ionic.keyboard",
//   "org.apache.cordova.splashscreen",
//   {
//     "locator": "https://github.com/MobileChromeApps/cordova-crosswalk-engine.git",
//     "id": "org.cordova.croswalk"
//   },
//   {
//     "locator": "/path/to/cloned/phonegap-facebook-plugin",
//     "id": "",
//     "variables": {
//         "APP_ID": "some_id",
//         "APP_NAME": "some_name"
//     }
//   }
// ]

var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    Q = require('q'),
    shelljs = require('shelljs'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    _ = require('underscore'),
    IonicProject = require('./project'),
    IonicInfo = require('./info').IonicTask;

var State = module.exports

shelljs.config.silent = true;

var IonicTask = function() {};

IonicTask.prototype = new Task();

State.saveState = function saveState() {
  console.log('saveState')
  
  var packageJsonPath = path.resolve('.', 'package.json')
  var packageJson = require(packageJsonPath)
  try {
    State.saveExistingPlatforms(packageJson)
    State.saveExistingPlugins(packageJson)
    State.savePackageJson(packageJson)
  } catch(ex) {
    console.log('There was an error saving your current Ionic setup'.red)
    console.log('Error:', ex)
  }
}

State.saveExistingPlatforms = function saveExistingPlatforms(packageJson) {
  var pp = path.resolve('.', 'platforms')
  console.log(pp)

  var platforms = fs.readdirSync(pp);

  // console.log('h')
  platforms.forEach(function(platform) {
    console.log('Saving', platform, 'platform')
    try {
      var versionPath = path.resolve(pp, platform, 'cordova', 'version');
      var version = State.getPlatformVersion(versionPath);
      console.log('we had version', version)
      var locator = platform;

      //Check to see if its crosswalk
      if(platform == 'android' && version.indexOf('-dev') != -1) {
        console.log('crosswalk android')
        //Look up path for engine/cordova-android path
        var engineFiles = fs.readdirSync(path.resolve('engine'));
        var enginePath = null;
        engineFiles.forEach(function(engineDir) {
          if(engineDir.indexOf('android') != -1) {
            enginePath = engineDir;
          }
        })
        locator = path.resolve('engine', enginePath);
      }

      console.log('locator', locator)

      if(!packageJson.cordovaPlatforms) {
        packageJson.cordovaPlatforms = [];
      }

      var platformExists = _.findWhere(packageJson.cordovaPlatforms, {platform: platform});

      console.log('platformExists:', platformExists)
      if(!platformExists) {
        packageJson.cordovaPlatforms.push({platform: platform, version: version, locator: locator});
      }

    } catch(ex) {
      console.log('e', ex)
    }
  })
  // console.log('platforms', platforms)
}

State.saveExistingPlugins = function saveExistingPlugins(packageJson) {
  var pluginDir = path.resolve('.', 'plugins')
  console.log(pluginDir)

  var plugins = fs.readdirSync(pluginDir);

  //Lets try just relying on the fetch.json file
  //this file lists all plugins with where they come from, etc
  var fetchJson = require(path.resolve('plugins', 'fetch.json'));
  
  var configXmlPath = path.resolve('config.xml')
  var cordovaPlugins = [];

  // console.log('config xml path ', configXmlPath)
  var configXmlData = State.getXmlData(configXmlPath)

  console.log('config.xml data:', configXmlData)

  if(fetchJson) {
    // console.log('fetchJson', fetchJson)
    //This will break with what we had before
    var cordovaPlugins = [];
    for (var pluginId in fetchJson) {
      // cordovaPlugins.push();
      // console.log('plugin:', pluginId)
      var plugin = fetchJson[pluginId]
      var pluginToAdd = {}

      console.log('plugin info')
      console.log(plugin)

      var locator;

      console.log('plugin.source.type', plugin.source.type)

      if(plugin.source.type == 'registry') {
        locator = pluginId
      } else {
        console.log('we have a local or git plugin', pluginId)
        if(plugin.source.type == 'local') {
          console.log('!!!  local')
          locator = plugin.source.path
        } else { //asume its git
          console.log('!!!  git')
          locator = plugin.source.url
        }
      }

      var pluginXmlPath = path.resolve('plugins', pluginId, 'plugin.xml')

      var pluginXml = State.getXmlData(pluginXmlPath)

      // console.log('got pluginXml:', pluginXml)

      var pluginName = pluginXml.plugin.name;

      var preferences = pluginXml.plugin.preference;

      var hasVariables = false,
          variableList = [],
          keyValueList = {};

      if(preferences && preferences.length > 0) {
        
        hasVariables = true;

        preferences.forEach(function(preference) {
          variableList.push(preference.$.name);
          // console.log('looking at preference: ', preference)
        })
      }

      if(hasVariables) {
        // console.log('we have avariables to look at:', variableList)
        
        var features = configXmlData.widget.feature;
        console.log('features', features)
        var feature;

        features.forEach(function(potFeature) {
          if(potFeature.$.name == pluginName) {
            feature = potFeature
          }
        })

        // console.log('feature found:', feature);
        var featureParams = feature.param;

        variableList.forEach(function(variable) {
          // console.log('Looking up variable:', variable)
          for(var i = 0, j = featureParams.length; i < j; i++) {
            if(variable == featureParams[i].$.name) {
              keyValueList[variable] = featureParams[i].$.value;
            }
          }
        })

        // console.log('We have the plugin parameters with values:', keyValueList)

        var pluginObj = {id: pluginId, locator: locator, variables: keyValueList};
        cordovaPlugins.push(pluginObj)

      } else if (plugin.source.type == 'git') {
        cordovaPlugins.push({locator: locator, id: pluginId});
      } else {
        cordovaPlugins.push(pluginId)
      }

    }//closes for loop for fetch.json

    packageJson.cordovaPlugins = cordovaPlugins

    // console.log('packageJson now:', packageJson)
  }

} //Closes saveExistingPlugins

State.getXmlData = function getXmlData(xmlPath) {
  var xml2js = require('xml2js');
  var xmlString = fs.readFileSync(xmlPath, { encoding: 'utf8' });
  var xmlData;

  var parseString = xml2js.parseString;
  parseString(xmlString, function (err, jsonConfig) {
    if(err) {
      return self.fail('Error parsing xml file: ' + err);
    }
    try {
      xmlData = jsonConfig;
    } catch(e) {
      return self.fail('Error parsing ' + xmlPath + ': ' + e);
    }
  });

  return xmlData
}

State.getPlatformVersion = function getPlatformVersion(path) {
  var result = shelljs.exec(['node', path].join(' '), { silent: true });
  if(result.code != 0) {
    return 'Not installed';
  }
  var version = result.output
  console.log('Version for path:', path, version)
  return version.replace(/\n/g, '');
}

State.savePlatform = function savePlatform(platformArgs) {
  // console.log('platform args:'.green, platformArgs);
  // { _: 
  //    [ 'platform',
  //      'add',
  //      'https://github.com/apache/cordova-android.git' ],
  //   'no-hook': false,
  //   n: false,
  //   r: false,
  //   'no-resources': false,
  //   save: true,
  //   '$0': '/usr/local/bin/ionic' }

  // Locator may be:
  // Name:        ios, android
  // Local path:  ./engine/cordova-android-c0.6.1
  // Http url:    https://github.com/apache/cordova-android.git
  var locator = platformArgs._[2];
  var platform = 'ios';

  var packageJsonPath = path.resolve('.', 'package.json')
  var packageJson = require(packageJsonPath)

  if(!packageJson.cordovaPlatforms) {
    packageJson.cordovaPlatforms = [];
  }


  //Test to see if its just ios or android
  if(locator === 'ios' || locator === 'android') {
    platform = locator;
  } else { //its path or url
    platform = locator.indexOf('ios') != -1 ? 'ios' : 'android';
  }

  var platformExists = _.findWhere(packageJson.cordovaPlatforms, {platform: platform});

  // console.log('platformExists:', platformExists)
  if(!platformExists) {
    packageJson.cordovaPlatforms.push({platform: platform, locator: locator});
    // packageJson.cordovaPlatforms.push({platform: platform, version: version, locator: locator});
  } else {
    platformExists.platform = platform
    platformExists.locator = locator
  }

  State.savePackageJson(packageJson);

}

State.savePackageJson = function savePackageJson(packageJsonData) {
  try {
    var packageJsonPath = path.resolve('package.json');
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonData, null, 2));
  } catch (e) {
    console.log(('Error saving ' + packageJsonPath + ': ' + e).error.bold);
  }
}

State.savePlugin = function savePlugin(pluginArgs) {

}

State.restoreState = function restoreState() {

  console.log('Attempting to restore your Ionic application from package.json\n'.yellow.bold);

  var packageJsonPath = path.resolve('.', 'package.json')
  var packageJson = require(packageJsonPath)

  //Restore plugins first - to avoid issues with platforms adding
  //without variables
  if(!packageJson.cordovaPlugins) {
    packageJson.cordovaPlugins = []
  }

  console.log('Restoring Platforms\n'.blue.bold)

  // console.log('processPlugin: defer:', defer)
  
  // State.processPlugin(0, packageJson, defer)
  State.restorePlatforms(packageJson)
  .then(function() {
    console.log('\nRestore platforms is complete\n'.green.bold)
    console.log('\rRestoring Plugins\n'.blue.bold)
    return State.restorePlugins(packageJson)
  })
  .then(function() {
    console.log('Restore plugins is complete\n'.green.bold)
    console.log('Ionic state restore completed\n'.blue.bold)
  })
  .catch(function(ex) {
    console.log('Ionic state restore failed\n'.red.bold)
    console.log(ex)
  })
}

State.restorePlugins = function restorePlugins(packageJson) {
  var q = Q.defer();

  State.processPlugin(0, packageJson, q);
  // q.resolve();

  return q.promise;
}

State.restorePlatforms = function restorePlatforms(packageJson) {
  var q = Q.defer();

  State.processPlatform(0, packageJson, q);

  return q.promise;
}

State.processPlatform = function processPlatform(index, packageJson, promise) {
  if(index >= packageJson.cordovaPlatforms.length) {
    promise.resolve();
    return
  }

  try {
    // console.log('processing platform', index, packageJson)
    var platform = packageJson.cordovaPlatforms[index];
    var platformCommand;

    if(typeof platform == 'string') {
      platformCommand = ['cordova platform add ', platform].join('')
    } else {
      //Here, they have either a special version, or locator for
      //local install or github install
      platformCommand = 'cordova platform add ' + platform.locator;
    }
    // var platformCommand = State.createAddRemoveStatement(platform);
    console.log(platformCommand);
    exec(platformCommand, function(){
        State.processPlatform(index + 1, packageJson, promise);
    });
  } catch(ex) {
    console.log('An error happened processing the previous cordova plugins')
    console.log('Error:', ex)
    promise.reject(ex)
  }
}

State.createAddRemoveStatement = function createAddRemoveStatement(plugin) {
    // console.log('Creating add/remove statement', plugin)
    try {
      var pluginCmd = 'cordova plugin add ';
      if(typeof plugin === 'string') {
        pluginCmd += plugin;
      } else {
        pluginCmd += plugin.locator + ' ';
        if(plugin.variables) {
            Object.keys(plugin.variables).forEach(function(variable){
                pluginCmd += '--variable ' + variable + '="' + plugin.variables[variable] + '" ';
            });
        }
      }
    } catch(ex) {
      console.log('Failed to create add plugin statement:', ex)
    }

    // console.log('plugin cmd', pluginCmd)

    return pluginCmd;
}

State.processPlugin = function processPlugin(index, packageJson, promise) {
  if(index >= packageJson.cordovaPlugins.length) {
    promise.resolve();
    return
  }
  try {
    // console.log('processing plugin', index, packageJson)
    var plugin = packageJson.cordovaPlugins[index];
    var pluginCommand = State.createAddRemoveStatement(plugin);
    console.log(pluginCommand);
    exec(pluginCommand, function(){
        State.processPlugin(index + 1, packageJson, promise);
    });
  } catch(ex) {
    console.log('An error happened processing the previous cordova plugins')
    console.log('Error:', ex)
    promise.reject(ex)
  }
}

IonicTask.prototype.run = function run(ionic) {
  var self = this;
  this.ionic = ionic;

  console.log('Args: ', argv._);

  switch(argv._[1]) {
    case 'save': 
      State.saveState()
      break;
    case 'restore':
      State.restoreState();
      break;
  }

  IonicStats.t();

};

exports.IonicTask = IonicTask;
