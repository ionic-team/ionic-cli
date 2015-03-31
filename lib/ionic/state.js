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

State.getPackageJson = function getPackageJson() {
  var packageJsonPath = path.resolve('.', 'package.json')
  var packageJson = null;

  try {
    packageJson = require(packageJsonPath)
  } catch(ex) {
    console.log('There was an error opening your package.json file.')
    console.log(ex);
    Ionic.fail(ex);
  }

  return packageJson;
}

State.saveState = function saveState() {
  console.log('saveState')
  
  var packageJson = State.getPackageJson();
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


  var platforms = [];

  try {
    platforms = fs.readdirSync(pp);
  } catch (ex) { }

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
        
        // var features = configXmlData.widget.feature;
        // console.log('features', features)
        var featureParams = State.getPluginParameters(configXmlData, pluginName);
        // features.forEach(function(potFeature) {
        //   if(potFeature.$.name == pluginName) {
        //     feature = potFeature
        //   }
        // })

        // console.log('feature found:', feature);
        // var featureParams = feature.param;

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
// console.log('string:', xmlString)
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
  // Locator may be:
  // Name:        ios, android
  // Local path:  ./engine/cordova-android-c0.6.1
  // Http url:    https://github.com/apache/cordova-android.git
  var locator = platformArgs._[2];
  var platform = 'ios';
  var requiresLocator = false;

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
    requiresLocator = true;
  }

  var platformExists = _.findWhere(packageJson.cordovaPlatforms, {platform: platform});

  // console.log('platformExists:', platformExists)
  if(!platformExists && requiresLocator) {
    packageJson.cordovaPlatforms.push({platform: platform, locator: locator});
    // packageJson.cordovaPlatforms.push({platform: platform, version: version, locator: locator});
  } else if(!platformExists && !requiresLocator) {
    packageJson.cordovaPlatforms.push(platform);
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

State.removePlatform = function removePlatform(platformArgs) {
  console.log('Args:', platformArgs);
  //Expecting - ionic platform remove [ios|android]

  //TODO - check if they pass multiple platforms
  //ionic platform remove ios android
  var platformToRemove = platformArgs._[2]
  var packageJson = State.getPackageJson();
  var cordovaPlatforms = packageJson.cordovaPlatforms ? packageJson.cordovaPlatforms : [];

  console.log('Removing platform:', platformToRemove);

  for (var i = 0, j = cordovaPlatforms.length; i < j; i++) {
    var platformEntry = cordovaPlatforms[i];
    if (typeof platformEntry == 'string') {
      cordovaPlatforms.splice(i, 1);
      break;
    } else if (platformEntry.platform == platformToRemove) {
      //Its object {platform: 'android', locator: './engine/cordova-android'}
        cordovaPlatforms.splice(i, 1);
        break;
    }
  }

  console.log('After removing elements - ', cordovaPlatforms);

  State.savePackageJson(packageJson);

}

State.getPluginParameters = function getPluginParameters(configXmlData, pluginName) {
  if(!configXmlData || !configXmlData.widget || !configXmlData.widget.feature) {
    throw 'Invalid Config XML Data';
  }

  var features = configXmlData.widget.feature,
      feature;

  features.forEach(function(potFeature) {
    if(potFeature.$.name == pluginName) {
      feature = potFeature
    }
  })

  if(feature && feature.param) {
    return feature.param
  }

  return null;
}

State.savePlugin = function savePlugin(pluginArgs) {
  console.log('SAveplugin:', pluginArgs);

  //Expects - either simple ID for plugin registry
  //or a local path, with or without variables
  //ionic plugin add org.apache.cordova.splashscreen
  //ionic plugin add ../phonegap-facebook-plugin --variable APP_ID="123456789" --variable APP_NAME="myApplication"

  //With a local file locator, we can look at the plugin.xml as it exists
  //If its a git resource locator, we'll have to look at fetch.json
  //Idea: this is run after platform add/rm is done

  var packageJson = State.getPackageJson();

  if(!packageJson.cordovaPlugins) {
    packageJson.cordovaPlugins = [];
  }

  var pluginLocator,
      pluginId,
      pluginInfo = {},
      hasLocator = false;

  pluginId = pluginArgs._[2] //grab the org.ionic.keyboard or ./engine/cordova-android

  // console.log('Plugin id:', pluginId)

  if (pluginId.indexOf('/') != -1) {
    hasLocator = true;
    //Its a locator, local file path or https://github.com repo
    pluginLocator = pluginId;
    pluginId = null;//We dont know ID yet.
    var fetchJson = require(path.resolve('plugins', 'fetch.json'));

    for (var lookupId in fetchJson) {
      var lookupPlugin = fetchJson[lookupId]
      // console.log('Weve got lookupPlugin:', lookupPlugin)
      var isNotRegistyPlugin = lookupPlugin.source.type && lookupPlugin.source.type != 'registry';
      var hasUrlOrPathOfLocator = lookupPlugin.source.path == pluginLocator || lookupPlugin.source.url == pluginLocator;      

      if(isNotRegistyPlugin && hasUrlOrPathOfLocator) {
        pluginId = lookupId;
        console.log('We found the plugin: ', pluginId)
        break;
      }
    }

    pluginInfo.id = pluginId;
    pluginInfo.locator = pluginLocator;

  } else { //closes if pluginId is file or url
    pluginInfo.id = pluginId;//Save just the org.ionic.keyboard string
  }

  //Now weve got locator, pluginId
  //Just gotta save the variables
  if (pluginArgs.variable) {
    pluginInfo.variables = {};
    for (var i = 0, j = pluginArgs.variable.length; i < j; i++)  {
      //variable: [ 'APP_ID=123456789', 'APP_NAME=myApplication' ]
      var splits = pluginArgs.variable[i].split('=');
      pluginInfo.variables[splits[0]] = splits[1];
    }
  }


  if (!hasLocator && !pluginInfo.variables) {
    //This case - its com.ionic.keyboard and no variables
    //Store it as just a string, otherwise, store the object
    pluginInfo = pluginId;
  }

  //Check to see if platforms exist
  //bug with cordova is, it doesnt add the entry into
  //config.xml unless a platform has been added.
  var configXmlPath = path.resolve('config.xml')
  var pluginXmlPath = path.resolve('plugins', pluginId, 'plugin.xml');
  
  console.log('plugin path:', pluginXmlPath)

  var pluginXmlData = State.getXmlData(pluginXmlPath);
  // console.log('plugin data')
  var configXmlData = State.getXmlData(configXmlPath);

  console.log('xml data:', pluginXmlData)

  var pluginName = pluginXmlData.plugin.name;

  console.log('paths set name:', pluginName)


  var params = State.getPluginParameters(configXmlData, pluginName);
  if(!params) {
    //We need to add them
    console.log('There are no params, probably platforms werent added');

    var feature = {'$': { name: pluginName}, param: [] }
    if(!configXmlData.widget.feature) {
      configXmlData.widget.feature = []
    }
    for(paramName in pluginInfo.variables) {
      //Go thru vars and add to param
      var param = { '$': { name: paramName, value: pluginInfo.variables[paramName]}}
      console.log('param:', param)
      feature.param.push(param);
    }

    configXmlData.widget.feature.push(feature)

    //Now to save config.xml file
    console.log('xml data:', configXmlData)
    State.saveXmlFile(configXmlData, configXmlPath);
  }
  //Now we have as an array:
  // <param name="id" value="com.phonegap.plugins.facebookconnect"/>
  // <param name="installPath" value="../phonegap-facebook-plugin"/>
  // <param name="APP_ID" value="616451688482285"/>
  // <param name="APP_NAME" value="hybrid-app"/>


  // var features = configXmlData.widget.feature;
  // console.log('features', features)
  // var feature;

  // features.forEach(function(potFeature) {
  //   if(potFeature.$.name == pluginName) {
  //     feature = potFeature
  //   }
  // })

  // console.log('Plugin info to save: ', pluginInfo);

  var existingPlugin = null;

  //We need to check cordovaPlugins
  //perhaps the ID already exists, or the 'id' in the object with locator exists.
  for (var i = 0, j = packageJson.cordovaPlugins.length; i < j; i++) {
    if(typeof packageJson.cordovaPlugins[i] == 'string' && packageJson.cordovaPlugins[i] == pluginId) {
      existingPlugin = packageJson.cordovaPlugins[i];
    } else if (packageJson.cordovaPlugins[i].id == pluginId) {
      existingPlugin = packageJson.cordovaPlugins[i];
    }
  }

  if(!existingPlugin) {
    packageJson.cordovaPlugins.push(pluginInfo);
  }

  //By now we assume pluginId is set, and locator might be set.
  State.savePackageJson(packageJson)
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
