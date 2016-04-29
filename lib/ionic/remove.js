'use strict';

var _ = require('underscore');
var exec = require('child_process').exec;
var IonicAppLib = require('ionic-app-lib');
var fail = IonicAppLib.utils.fail;
var ioLib = IonicAppLib.ioConfig;
var log = IonicAppLib.logging.logger;
var bower = require('../utils/bower');

var settings = {
  title: 'remove',
  name: 'remove',
  summary: 'Remove an Ion, bower component, or addon from the project',
  args: {
    '[name]': 'The name of the Ion, bower component, or addon you wish to remove'
  },
  alt: ['rm']
};

function uninstallBowerComponent(componentName) {
  var bowerUninstallCommand = 'bower uninstall --save-dev ' + componentName;

  var result = exec(bowerUninstallCommand);

  if (result.code !== 0) {
    var errorMessage = 'Failed to find the bower component "'.red.bold + componentName.verbose +
      '"'.red.bold + '.\nAre you sure it exists?'.red.bold;

    fail(errorMessage, 'add');
  } else {
    var message = 'Bower component removed - ' + componentName;
    log.info(message.red);
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
    uninstallBowerComponent(componentName);
  } catch (error) {
    var errorMessage = error.message ? error.message : error;
    fail(errorMessage, 'service');
  }

  // Inject the component into our index.html, if necessary, and save the app_id
  ioLib.injectIoComponent(ioSet, componentName);
  ioLib.warnMissingData();
}

module.exports = _.extend(settings, {
  run: run
});
