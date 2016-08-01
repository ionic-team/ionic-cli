#!/usr/bin/env node

/**
 * Install all plugins listed in package.json
 * https://raw.githubusercontent.com/diegonetto/generator-ionic/master/templates/hooks/after_platform_add/install_plugins.js
 */
var exec = require('child_process').exec;
var path = require('path');
var util = require('util');

var packageJSON = null;

try {
  packageJSON = require('../../package.json');
} catch(ex) {
  console.log('\nThere was an error fetching your package.json file.')
  console.log('\nPlease ensure a valid package.json is in the root of this project\n')
  return;
}

var cmd = process.platform === 'win32' ? 'cordova.cmd' : 'cordova';
// var script = path.resolve(__dirname, '../../node_modules/cordova/bin', cmd);

packageJSON.cordovaPlugins = packageJSON.cordovaPlugins || [];
packageJSON.cordovaPlugins.forEach(function (plugin) {
  // logging.logger.info('Creating add/remove statement', plugin)
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
    logging.logger.error('Failed to create add plugin statement: %s', ex, {})
  }

  // logging.logger.info('plugin cmd', pluginCmd)

  exec(pluginCmd, function (error, stdout, stderr) {
    console.log(stdout);
  });
});
