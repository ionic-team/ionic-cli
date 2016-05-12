'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
var path = require('path');
var IonicAppLib = require('ionic-app-lib');
var fail = IonicAppLib.utils.fail;
var ioLib = IonicAppLib.ioConfig;
var log = IonicAppLib.logging.logger;
var bower = require('../utils/bower');

var settings = {
  title: 'list',
  name: 'list',
  summary: 'List Ions, bower components, or addons in the project',
  module: './ionic/add',
  alt: ['ls']
};

function listComponents() {
  try {
    var bowerJson = require(path.join(process.cwd(), 'bower.json'));
    log.info('Ions, bower components, or addons installed: ');
    for (var bowerCompIndex in bowerJson.devDependencies) {
      if ({}.hasOwnProperty.call(bowerJson.devDependencies, bowerCompIndex)) {
        log.info(bowerCompIndex.green);
      }
    }
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
function run(ionic, argv) {

  if (!bower.IonicBower.checkForBower()) {
    fail(bower.IonicBower.installMessage, 'add');
    return;
  }

  var componentName = argv._[1];
  var ioSet = false;

  try {
    listComponents();
  } catch (error) {
    var errorMessage = error.message ? error.message : error;
    fail(errorMessage, 'service');
  }

  // Inject the component into our index.html, if necessary, and save the app_id
  ioLib.injectIoComponent(ioSet, componentName);
  ioLib.warnMissingData();
}

module.exports = extend(settings, {
  run: run
});
