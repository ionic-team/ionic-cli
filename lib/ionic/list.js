'use strict';

require('colors');

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
var path = require('path');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var log = IonicAppLib.logging.logger;
var fs = require('fs');

var settings = {
  title: 'list',
  name: 'list',
  summary: 'List Ions, bower components, or addons in the project'
};

function listComponents() {
  try {
    var bowerJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'bower.json')));
    log.info('Ions, bower components, or addons installed:');

    Object.keys(bowerJson.devDependencies).forEach(function(bowerComponentName) {
      log.info(bowerComponentName.green);
    });
  } catch (ex) {
    log.error('This command can only be used when in an Ionic project directory'.red.bold);
  }
}

/**
 * Need to look at bower.json of package just installed and look for any cordova plugins required
 * Check the directory in the projects `.bowerrc` file
 * Then go to /path/to/bower/components/<ionic-service-componentName>/ionic-plugins.json - 'plugins'
 * For each plugins - call 'ionic add plugin <current-required-plugin>'
 */
function run() {

  try {
    listComponents();
  } catch (error) {
    var errorMessage = error.message ? error.message : error;
    appLibUtils.fail(errorMessage, 'list');
  }
}

module.exports = extend(settings, {
  run: run
});
