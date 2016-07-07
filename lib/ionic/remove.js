'use strict';

var extend = require('../utils/extend');
var childProcess = require('child_process');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
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
  isProjectTask: true
};

function uninstallBowerComponent(componentName) {
  var bowerUninstallCommand = 'bower uninstall --save-dev ' + componentName;

  var result = childProcess.exec(bowerUninstallCommand);

  if (result.code !== 0) {
    var errorMessage = 'Failed to find the bower component "'.red.bold + componentName.verbose +
      '"'.red.bold + '.\nAre you sure it exists?'.red.bold;

    appLibUtils.fail(errorMessage, 'remove');
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

  // This command will be deprecated in the future.
  var deprecationMsg = 'This command has been ' + 'deprecate'.red + '.  All ' +
   'resources are currently available in NPM and we recommend that you use NPM to manage these.\n' +
   'More information is available here: https://github.com/driftyco/ionic-cli/wiki/Migrating-to-NPM-from-bower\n';
  log.info(deprecationMsg.bold);

  if (!bower.checkForBower()) {
    appLibUtils.fail(bower.installMessage, 'remove');
    return;
  }

  var componentName = argv._[1];
  var ioSet = false;

  try {
    uninstallBowerComponent(componentName);
  } catch (error) {
    var errorMessage = error.message ? error.message : error;
    appLibUtils.fail(errorMessage, 'service');
  }

  // Inject the component into our index.html, if necessary, and save the app_id
  ioLib.injectIoComponent(ioSet, componentName);
  ioLib.warnMissingData();
}

module.exports = extend(settings, {
  run: run
});
