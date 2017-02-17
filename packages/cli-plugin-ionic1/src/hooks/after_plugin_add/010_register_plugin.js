#!/usr/bin/env node

/**
 * Push plugins to cordovaPlugins array after_plugin_add
 */
var fs = require('fs');
var packageJSON = require('../../package.json');
var path = require('path');

packageJSON.cordovaPlugins = packageJSON.cordovaPlugins || [];
process.env.CORDOVA_PLUGINS.split(',').forEach(function(plugin) {
  var configString;
  var idRegEx;
  var id;
  var pluginXmlPath;
  var pluginToAdd;

  if (plugin.indexOf('https') !== -1 || plugin.indexOf('git') !== -1) {
    console.log('Installing plugin from url');
  }

  if (plugin.indexOf('/') !== -1) {
    try {
      pluginXmlPath = path.resolve(plugin, 'plugin.xml');
      console.log('got pluginXmlPath:', pluginXmlPath);
      if (!fs.existsSync(pluginXmlPath)) {
        console.log(['There was no plugin.xml file found for path: ', pluginXmlPath].join(''));
        return;
      }

      configString = fs.readFileSync(pluginXmlPath, { encoding: 'utf8' });
      idRegEx = new RegExp('<plugin[^>]*id="(.*)"', 'i');
      id = idRegEx.exec(configString)[1];
      pluginToAdd = { id: id, locator: plugin };
    } catch (ex) {
      console.log('There was an error retrieving the plugin.xml filr from the 010_register_plugin.js hook', ex);
    }
  } else {
    pluginToAdd = plugin;
  }

  if (typeof pluginToAdd == 'string' && packageJSON.cordovaPlugins.indexOf(pluginToAdd) === -1) {
    packageJSON.cordovaPlugins.push(pluginToAdd);
  } else if (typeof pluginToAdd == 'object') {
    var pluginExists = false;
    packageJSON.cordovaPlugins.forEach(function(checkPlugin) {
      if (typeof checkPlugin == 'object' && checkPlugin.id === pluginToAdd.id) {
        pluginExists = true;
      }
    });
    if (!pluginExists) {
      packageJSON.cordovaPlugins.push(pluginToAdd);
    }
  }
});

fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, 2));
