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

var State = module.exports;

shelljs.config.silent = true;

var IonicTask = function() {};

IonicTask.prototype = new Task();

State.getPackageJson = function getPackageJson() {
  var packageJsonPath = path.resolve('.', 'package.json');
  var packageJson = null;

  try {
    packageJson = require(packageJsonPath);
    if (!packageJson.cordovaPlugins) {
      packageJson.cordovaPlugins = [];
    }
    if (!packageJson.cordovaPlatforms) {
      packageJson.cordovaPlatforms = [];
    }
  } catch (ex) {
    console.log('There was an error opening your package.json file.');
    console.log(ex);
    Ionic.fail(ex);
  }

  return packageJson;
};

State.addOrUpdatePluginToPackageJson = function addOrUpdatePluginToPackageJson(packageJson, pluginId, pluginInfo) {
  var existingPlugin;

  if (typeof pluginInfo === 'undefined') {
    pluginInfo = pluginId;
  }

  //We need to check cordovaPlugins
  //perhaps the ID already exists, or the 'id' in the object with locator exists.
  for (var i = 0, j = packageJson.cordovaPlugins.length; i < j; i++) {
    if (typeof packageJson.cordovaPlugins[i] == 'string' && packageJson.cordovaPlugins[i] == pluginId) {
      existingPlugin = packageJson.cordovaPlugins[i];
    } else if (packageJson.cordovaPlugins[i].id == pluginId) {
      existingPlugin = packageJson.cordovaPlugins[i];
    }
  }

  if (!existingPlugin) {
    console.log('Adding since there was no existingPlugin')
    packageJson.cordovaPlugins.push(pluginInfo);
  }
};

State.saveState = function saveState() {
  console.log('Saving your Ionic app state of platforms and plugins'.blue.bold);
  var packageJson = State.getPackageJson();
  try {
    State.saveExistingPlatforms(packageJson);
    console.log('Saved platform'.green);
    State.saveExistingPlugins(packageJson);
    console.log('Saved plugins'.green);
    State.savePackageJson(packageJson);
    console.log('Saved package.json'.green);
  } catch (ex) {
    console.log('There was an error saving your current Ionic setup'.red);
    console.log('Error:', ex);
  }
};

State.saveExistingPlatforms = function saveExistingPlatforms(packageJson) {
  var pp = path.resolve('.', 'platforms'),
    platforms = [],
    platformPath,
    platformStats;

  try {
    platforms = fs.readdirSync(pp);
  } catch (ex) {
    return;
  }

  // console.log('h')
  platforms.forEach(function(platform) {
    platformPath = path.resolve('platforms', platform);
    platformStats = fs.statSync(platformPath);
    if (!platformStats.isDirectory()) {
      return
    }

    try {
      var versionPath = path.resolve(pp, platform, 'cordova', 'version');
      var version = State.getPlatformVersion(versionPath);
      var locator = platform;

      //Check to see if its crosswalk
      if (platform === 'android' && version.indexOf('-dev') !== -1) {
        //Look up path for engine/cordova-android path
        var engineFiles = fs.readdirSync(path.resolve('engine'));
        var enginePath = null;
        engineFiles.forEach(function(engineDir) {
          if (engineDir.indexOf('android') !== -1) {
            enginePath = engineDir;
          }
        });
        locator = path.resolve('engine', enginePath);
      }

      var platformExists = _.findWhere(packageJson.cordovaPlatforms, {platform: platform});

      if (!platformExists) {
        packageJson.cordovaPlatforms.push({platform: platform, version: version, locator: locator});
      }

    } catch (ex) {
      console.log('There was an error trying to save your existing state', ex);
    }
  });
};

State.saveExistingPlugins = function saveExistingPlugins(packageJson) {
  var pluginDir = path.resolve('.', 'plugins');
  // console.log(pluginDir);

  var plugins = fs.readdirSync(pluginDir);
  var pluginId;

  //Lets try just relying on the fetch.json file
  //this file lists all plugins with where they come from, etc
  var fetchJson;

  try {
    fetchJson = require(path.resolve('plugins', 'fetch.json'));
  } catch (ex) {
    // Ionic.fail('There is not a fetch.json file available in your plugins folder.');
    // return;
  }

  var configXmlPath = path.resolve('config.xml');
  var plugin,
    pluginToAdd,
    locator;
  var cordovaPlugins = [];

  // console.log('config xml path ', configXmlPath)
  var configXmlData = State.getXmlData(configXmlPath);

  var pluginPath,
      pluginPathStats,
      pluginXmlPath,
      pluginXml,
      pluginName,
      featureParams,
      preferences,
      hasVariables = false,
      variableList = [],
      keyValueList = {};


  if (fetchJson) {
    // console.log('fetchJson', fetchJson)
    //This will break with what we had before
    for (pluginId in fetchJson) {
      // cordovaPlugins.push();
      plugin = fetchJson[pluginId];
      pluginToAdd = {};
      try {
        pluginPath = path.resolve('plugins', pluginId);
        pluginPathStats = fs.statSync(pluginPath);
      } catch (ex) {
        console.log(['Plugin', pluginId, 'does not exist in the plugins directory. Skipping'].join(' ').yellow);
        continue;
      }

      if (!pluginPathStats.isDirectory()) {
        console.log(['Plugin', pluginId, 'does not exist in the plugins directory. Skipping'].join(' ').yellow);
        continue;
      }

      // console.log('plugin.source.type', plugin.source.type);

      if (plugin.source.type === 'registry') {
        locator = pluginId;
      } else {
        if (plugin.source.type === 'local') {
          locator = plugin.source.path;
        } else { //asume its git
          locator = plugin.source.url;
        }
      }

      pluginXmlPath = path.resolve('plugins', pluginId, 'plugin.xml');
      pluginXml = State.getXmlData(pluginXmlPath)

      pluginName = pluginXml.plugin.name;

      preferences = pluginXml.plugin.preference;

      if (preferences && preferences.length > 0) {
        hasVariables = true;

        preferences.forEach(function(preference) {
          variableList.push(preference.$.name);
          // console.log('looking at preference: ', preference)
        })
      }

      hasVariables = false;
      variableList = [];
      keyValueList = {};

      if (hasVariables) {
        // console.log('we have avariables to look at:', variableList)
        // var features = configXmlData.widget.feature;
        // console.log('features', features)
        featureParams = State.getPluginParameters(configXmlData, pluginName);
        // features.forEach(function(potFeature) {
        //   if(potFeature.$.name == pluginName) {
        //     feature = potFeature
        //   }
        // })

        // console.log('feature found:', feature);
        // var featureParams = feature.param;

        variableList.forEach(function(variable) {
          // console.log('Looking up variable:', variable)
          for (var i = 0, j = featureParams.length; i < j; i++) {
            if (variable == featureParams[i].$.name) {
              keyValueList[variable] = featureParams[i].$.value;
            }
          }
        })

        // console.log('We have the plugin parameters with values:', keyValueList)

        var pluginObj = {id: pluginId, locator: locator, variables: keyValueList};
        cordovaPlugins.push(pluginObj)

      } else if (plugin.source.type === 'git' || plugin.source.type === 'local') {
        cordovaPlugins.push({locator: locator, id: pluginId});
      } else {
        cordovaPlugins.push(pluginId)
      }

    }//closes for loop for fetch.json

    packageJson.cordovaPlugins = cordovaPlugins
  } else {
    console.log('There was no fetch.json file available to restore plugin information from.'.red.bold);
    console.log('Restoring plugins from scanning the plugins folder is still being worked on.'.red.bold);
  }

} //Closes saveExistingPlugins

State.getXmlData = function getXmlData(xmlPath) {
  var xml2js = require('xml2js');
  var xmlString = fs.readFileSync(xmlPath, { encoding: 'utf8' });
  var xmlData;
  var parseString = xml2js.parseString;
  parseString(xmlString, function(err, jsonConfig) {
    if (err) {
      return self.fail('Error parsing xml file: ' + err);
    }
    try {
      xmlData = jsonConfig;
    } catch (e) {
      return self.fail('Error parsing ' + xmlPath + ': ' + e);
    }
  });

  return xmlData
}

State.getPlatformVersion = function getPlatformVersion(path) {
  var result = shelljs.exec(['node', path].join(' '), { silent: true });
  if (result.code != 0) {
    return 'Not installed';
  }
  var version = result.output
  // console.log('Version for path:', path, version)
  return version.replace(/\n/g, '');
}

State.addOrUpdatePlatformToPackageJson = function addOrUpdatePlatformToPackageJson(packageJson, platformId, platformInfo) {
  // var platformExists = _.findWhere(packageJson.cordovaPlatforms, {platform: platformId});
  var existingPlatform;

  if (typeof platformInfo === 'undefined') {
    platformInfo = platformId;
  }

  for (var i = 0, j = packageJson.cordovaPlatforms.length; i < j; i++) {
    if (typeof packageJson.cordovaPlatforms[i] == 'string' && packageJson.cordovaPlatforms[i] == platformId) {
      existingPlatform = packageJson.cordovaPlatforms[i];
    } else if (packageJson.cordovaPlatforms[i].id == platformId) {
      existingPlatform = packageJson.cordovaPlatforms[i];
      existingPlatform.locator = platformInfo.locator;
    }
  }

  if (!existingPlatform) {
    packageJson.cordovaPlatforms.push(platformInfo);
  }
  // console.log('platformExists:', platformExists)
  // if (!platformExists && requiresLocator) {
  //   packageJson.cordovaPlatforms.push({platform: platform, locator: locator});
  //   // packageJson.cordovaPlatforms.push({platform: platform, version: version, locator: locator});
  // } else if (!platformExists && !requiresLocator) {
  //   packageJson.cordovaPlatforms.push(platform);
  // } else {
  //   platformExists.platform = platform
  //   platformExists.locator = locator
  // }
}

State.savePlatform = function savePlatform(platformArgs) {
  // Locator may be:
  // Name:        ios, android
  // Local path:  ./engine/cordova-android-c0.6.1
  // Http url:    https://github.com/apache/cordova-android.git
  // console.log('platform args:', platformArgs);
  var locator = platformArgs._[2];
  var platform = 'ios';
  var packageJson = State.getPackageJson();

  //Test to see if its just ios or android
  if (locator === 'ios' || locator === 'android') {
    platform = locator;
    State.addOrUpdatePlatformToPackageJson(packageJson, platform);
    return State.savePackageJson(packageJson);
  }

  platform = locator.indexOf('ios') != -1 ? 'ios' : 'android';

  var platformInfo = {
    platform: platform,
    locator: locator
  };

  State.addOrUpdatePlatformToPackageJson(packageJson, platform, platformInfo);

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

State.restoreState = function restoreState() {

  console.log('Attempting to restore your Ionic application from package.json\n'.yellow.bold);

  var packageJsonPath = path.resolve('.', 'package.json')
  var packageJson = require(packageJsonPath)

  //Restore plugins first - to avoid issues with platforms adding
  //without variables
  if (!packageJson.cordovaPlugins) {
    packageJson.cordovaPlugins = []
  }

  console.log('Restoring Platforms\n'.blue.bold)

  return State.restorePlatforms(packageJson)
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
  if (index >= packageJson.cordovaPlatforms.length) {
    promise.resolve();
    return
  }

  try {
    // console.log('processing platform', index, packageJson)
    var platform = packageJson.cordovaPlatforms[index];
    var platformCommand;

    if (typeof platform == 'string') {
      platformCommand = ['cordova platform add ', platform].join('')
    } else {
      //Here, they have either a special version, or locator for
      //local install or github install
      platformCommand = 'cordova platform add ' + platform.locator;
    }
    // var platformCommand = State.createAddRemoveStatement(platform);
    console.log(platformCommand);
    exec(platformCommand, function() {
        State.processPlatform(index + 1, packageJson, promise);
    });
  } catch (ex) {
    console.log('An error happened processing the previous cordova plugins')
    console.log('Error:', ex)
    promise.reject(ex)
  }
}

State.createAddRemoveStatement = function createAddRemoveStatement(plugin) {
    // console.log('Creating add/remove statement', plugin)
    try {
      var pluginCmd = 'cordova plugin add ';
      if (typeof plugin === 'string') {
        pluginCmd += plugin;
      } else {
        pluginCmd += plugin.locator + ' ';
        if (plugin.variables) {
            Object.keys(plugin.variables).forEach(function(variable) {
                pluginCmd += '--variable ' + variable + '="' + plugin.variables[variable] + '" ';
            });
        }
      }
    } catch (ex) {
      console.log('Failed to create add plugin statement:', ex)
    }

    // console.log('plugin cmd', pluginCmd)

    return pluginCmd;
}

State.processPlugin = function processPlugin(index, packageJson, promise) {
  if (index >= packageJson.cordovaPlugins.length) {
    promise.resolve();
    return
  }
  try {
    // console.log('processing plugin', index, packageJson)
    var plugin = packageJson.cordovaPlugins[index];
    var pluginCommand = State.createAddRemoveStatement(plugin);
    console.log(pluginCommand);
    exec(pluginCommand, function() {
        State.processPlugin(index + 1, packageJson, promise);
    });
  } catch (ex) {
    console.log('An error happened processing the previous cordova plugins')
    console.log('Error:', ex)
    promise.reject(ex)
  }
}

State.removePlatform = function removePlatform(platformArgs) {
  // console.log('Args:', platformArgs);
  //Expecting - ionic platform remove [ios|android]

  //TODO - check if they pass multiple platforms
  //ionic platform remove ios android
  var platformToRemove = platformArgs._[2],
    packageJson = State.getPackageJson(),
    platformEntry;

  for (var i = 0, j = packageJson.cordovaPlatforms.length; i < j; i++) {
    platformEntry = packageJson.cordovaPlatforms[i];
    if (typeof platformEntry === 'string' && platformEntry == platformToRemove) {
      packageJson.cordovaPlatforms.splice(i, 1);
      break;
    } else if (platformEntry.platform == platformToRemove) {
      //Its object {platform: 'android', locator: './engine/cordova-android'}
        packageJson.cordovaPlatforms.splice(i, 1);
        break;
    }
  }

  State.savePackageJson(packageJson);
};

State.getPluginParameters = function getPluginParameters(configXmlData, pluginName) {
  if (!configXmlData || !configXmlData.widget || !configXmlData.widget.feature) {
    throw 'Invalid Config XML Data';
  }

  var features = configXmlData.widget.feature,
      feature;

  features.forEach(function(potFeature) {
    if (potFeature.$.name == pluginName) {
      feature = potFeature
    }
  })

  if (feature && feature.param) {
    return feature.param
  }

  return null;
}

//
/**
* Used after `ionic plugin add <id|locator>` to save the plugin
* to package.json and config.xml.
* @pluginArgs  {Object} contains the command line args passed
* from the ionic command.
* { _: [ 'plugin', 'add', '../phonegap-facebook-plugin' ],
  variable: [ 'APP_ID=123456789', 'APP_NAME=myApplication' ],
  '$0': '/usr/local/bin/ionic' }
*/
State.savePlugin = function savePlugin(pluginArgs) {
  // console.log('Saveplugin:', pluginArgs);

  //Expects - either simple ID for plugin registry
  //or a local path, with or without variables
  //ionic plugin add org.apache.cordova.splashscreen
  //ionic plugin add ../phonegap-facebook-plugin --variable APP_ID="123456789" --variable APP_NAME="myApplication"

  //With a local file locator, we can look at the plugin.xml as it exists
  //If its a git resource locator, we'll have to look at fetch.json
  //Idea: this is run after platform add/rm is done

  var packageJson = State.getPackageJson(),
      pluginId,
      pluginInfo = {},
      plugin;

  pluginId = pluginArgs._[2] //grab the org.ionic.keyboard or ./engine/cordova-android

  // console.log('Plugin id:', pluginId)
  // State.saveRemotePlugin()

  if (pluginId.indexOf('/') === -1) { //its just an id
    State.addOrUpdatePluginToPackageJson(packageJson, pluginId);
    return State.savePackageJson(packageJson);
  }

  //By here, we know its not a registry plugin (git/local)
  //Its a locator, local file path or https://github.com repo
  pluginInfo.locator = pluginId;
  pluginInfo.id = pluginId = State.getPluginFromFetchJsonByLocator(pluginInfo.locator);

  // console.log('going on to variables now')

  //If there are no variables, we just add to package, then save
  if (!pluginArgs.variable) {
    State.addOrUpdatePluginToPackageJson(packageJson, pluginId, pluginInfo);
    return State.savePackageJson(packageJson);
  }

  //Check and save for variables

  pluginInfo.variables = {};
  for (var i = 0, j = pluginArgs.variable.length; i < j; i++)  {
    //variable: [ 'APP_ID=123456789', 'APP_NAME=myApplication' ]
    var splits = pluginArgs.variable[i].split('=');
    pluginInfo.variables[splits[0]] = splits[1];
  }

  // State.checkAndSaveConfigXml(pluginId);
  // console.log('Saved config.xml');
  // console.log('Plugin info to save: ', pluginInfo);
  State.addOrUpdatePluginToPackageJson(packageJson, pluginId, pluginInfo);

  console.log('Save plugin to package.json completed');

  //By now we assume pluginId is set, and locator might be set.
  return State.savePackageJson(packageJson);
}

State.removePlugin = function removePlugin(pluginArgs) {

}

State.saveXmlFile = function saveXmlFile(xmlData, xmlPath) {
  try {
    var xml2js = require('xml2js');
    var xmlBuilder = new xml2js.Builder();
    var configString = xmlBuilder.buildObject(xmlData);
    fs.writeFileSync(xmlPath, configString);
  } catch (ex) {
    console.log('Could not save your xml file to path:', xmlPath);
  }
}

State.getPluginFromFetchJsonByLocator = function getPluginFromFetchJsonByLocator(pluginLocator) {
  var fetchJson = require(path.resolve('plugins', 'fetch.json')),
    lookupId,
    lookupPlugin,
    isNotRegistyPlugin,
    hasUrlOrPathOfLocator,
    pluginId;

  for (lookupId in fetchJson) {
    lookupPlugin = fetchJson[lookupId];
    isNotRegistyPlugin = lookupPlugin.source.type && lookupPlugin.source.type != 'registry';
    hasUrlOrPathOfLocator = lookupPlugin.source.path == pluginLocator || lookupPlugin.source.url == pluginLocator;
    hasPathWithLeadingDot = lookupPlugin.source && lookupPlugin.source.replace('./', '') == pluginLocator

    if ((isNotRegistyPlugin && hasUrlOrPathOfLocator) || (isNotRegistyPlugin && hasPathWithLeadingDot)) {
      pluginId = lookupId;
      break;
    }
  }

  return pluginId;
}

State.checkAndSaveConfigXml = function checkAndSaveConfigXml(pluginId) {
  //Now we have as an array:
  // <param name="id" value="com.phonegap.plugins.facebookconnect"/>
  // <param name="installPath" value="../phonegap-facebook-plugin"/>
  // <param name="APP_ID" value="616451688482285"/>
  // <param name="APP_NAME" value="hybrid-app"/>

  //Check to see if platforms exist
  //bug with cordova is, it doesnt add the entry into
  //config.xml unless a platform has been added.
  var configXmlPath = path.resolve('config.xml');
  var pluginXmlPath = path.resolve('plugins', pluginId, 'plugin.xml');

  var pluginXmlData = State.getXmlData(pluginXmlPath);
  var configXmlData = State.getXmlData(configXmlPath);

  // console.log('xml data:', pluginXmlData);

  var pluginName = pluginXmlData.plugin.name[0],
      feature,
      param,
      paramName;

  var params = State.getPluginParameters(configXmlData, pluginName);
  if (!params) {
    //We need to add them
    feature = {'$': { name: pluginName }, param: [] };

    if (!configXmlData.widget.feature) {
      configXmlData.widget.feature = [];
    }

    for (paramName in pluginInfo.variables) {
      //Go thru vars and add to param
      param = { '$': { name: paramName, value: pluginInfo.variables[paramName] } };
      console.log('param:', param);
      feature.param.push(param);
    }

    configXmlData.widget.feature.push(feature);

    //Now to save config.xml file
    // console.log('xml data:', configXmlData);
    State.saveXmlFile(configXmlData, configXmlPath);
  }
}

State.resetState = function resetState() {
  shelljs.rm('-rf', ['platforms', 'plugins']);
  console.log('Removed platforms and plugins'.blue.bold);
  State.restoreState()
  .then(function() {
    console.log('Ionic reset state complete'.green.bold);
  })
}

State.clearState = function clearState() {
  console.log('Clearing out your Ionic app of platforms, plugins, and package.json entries'.blue.bold);
  shelljs.rm('-rf', ['platforms', 'plugins']);
  var packageJson = State.getPackageJson();
  packageJson.cordovaPlatforms = packageJson.cordovaPlugins = [];
  State.savePackageJson(packageJson);
  console.log('Ionic app state cleared'.green.bold);
}

IonicTask.prototype.run = function run(ionic) {
  var self = this,
      project,
      stats,
      projectPath;

  this.ionic = ionic;

  try {
    projectPath = path.resolve('ionic.project');
    stats = fs.statSync(projectPath);
  } catch (ex) {
    this.ionic.fail('You cannot run any state commands on a project that is not an Ionic project.\nTry adding an ionic.project file or running ionic start to get an application to save or restore');
    return;
  }

  try {
    project = IonicProject.load();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return;
  }

  // console.log('Args: ', argv._);

  switch (argv._[1]) {
    case 'save':
      State.saveState();
      break;
    case 'restore':
      State.restoreState();
      break;
    case 'reset':
      State.resetState();
      break;
    case 'clear':
      State.clearState();
      break;
    default:
      console.log('Please specify a command [ save | restore | reset | clear ] for the state command.'.red.bold);
  }

  IonicStats.t();

};

exports.IonicTask = IonicTask;
