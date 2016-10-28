'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var childProcess = require('child_process');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var ioLib = IonicAppLib.ioConfig;
var log = IonicAppLib.logging.logger;
var bower = require('../utils/bower');

var settings = {
  title: 'add',
  name: 'add',
  summary: 'Add an Ion, bower component, or addon to the project',
  args: {
    '[name]': 'The name of the ion, bower component, or addon you wish to install'
  },
  isProjectTask: true
};

function installBowerComponent(componentName) {
  var bowerInstallCommand = 'bower install --save-dev ' + componentName;

  try {
    var result = childProcess.execSync(bowerInstallCommand);
    if (result.code === 0) {
      return log.info('Bower component installed - ' + componentName);
    }
  } catch (e) {} // eslint-disable-line no-empty

  // Error happened, report it.
  var errorMessage = chalk.red.bold('Bower error, check that "') + componentName + 
    chalk.red.bold('" exists,\nor try running "') + bowerInstallCommand + chalk.red.bold('" for more info.');
  appLibUtils.fail(errorMessage, 'add');
}

/**
 * Need to look at bower.json of package just installed and look for any cordova plugins required
 * Check the directory in the projects `.bowerrc` file
 * Then go to /path/to/bower/components/<ionic-service-componentName>/ionic-plugins.json - 'plugins'
 * For each plugins - call 'ionic add plugin <current-required-plugin>'
 */
function run(ionic, argv) {

  // This command will be deprecated in the future.
  var deprecationMsg = 'This command has been ' + chalk.red('deprecated') + '.  All ' +
   'resources are currently available in NPM and we recommend that you use NPM to manage these.\n' +
   'More information is available here: https://github.com/driftyco/ionic-cli/wiki/Migrating-to-NPM-from-bower\n';
  log.info(chalk.bold(deprecationMsg));

  if (!bower.checkForBower()) {
    appLibUtils.fail(bower.installMessage, 'add');
    return;
  }

  var componentName = argv._[1];
  var ioSet = false;

  try {
    ioSet = true;
    installBowerComponent(componentName);
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
