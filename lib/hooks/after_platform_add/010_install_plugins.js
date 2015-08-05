#!/usr/bin/env node

/**
 * Install all plugins listed in package.json
 * https://raw.githubusercontent.com/diegonetto/generator-ionic/master/templates/hooks/after_platform_add/install_plugins.js
 */
var exec = require('child_process').exec;
var path = require('path');
var sys = require('sys');

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

function installNextPlugin() {
    var curPlugin = packageJSON.cordovaPlugins.shift();
    if (curPlugin) {
        exec('cordova plugin add ' + curPlugin, function(err, stdout, stderr) {
            sys.puts(stdout);
            sys.puts(stderr);
        })
            .on("exit", function(code) {
                if (code) {
                    console.log("'cordova plugin add " + curPlugin + "' failed with code '" + code + "'");
                    process.exit(code);
                } else {
                    installNextPlugin();
                }
            });
    }
}

installNextPlugin();
