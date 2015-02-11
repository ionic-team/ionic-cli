#!/usr/bin/env node

/**
 * Install all plugins listed in package.json
 * https://raw.githubusercontent.com/diegonetto/generator-ionic/master/templates/hooks/after_platform_add/install_plugins.js
 */
var exec = require('child_process').exec,
    path = require('path'),
    packageJSON = null;

try {
  packageJSON = require('../../package.json');
} catch(ex) {
  console.log('\nThere was an error fetching your package.json file.')
  console.log('\nPlease ensure a valid package.json is in the root of this project\n')
  return
}

var cmd = process.platform === 'win32' ? 'cordova.cmd' : 'cordova';

packageJSON.cordovaPlugins = packageJSON.cordovaPlugins || [];

function processPlugin(index) {
  if(index >= packageJSON.cordovaPlugins.length)
    return;

  var plugin = packageJSON.cordovaPlugins[index];
  var pluginCommand = [cmd, 'plugin add', plugin].join(' ');
  console.log(pluginCommand);
  exec(pluginCommand, function(){
    processPlugin(index + 1);
  });
}

processPlugin(0);
