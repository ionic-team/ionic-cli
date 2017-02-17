'use strict';

var extend = require('../utils/extend');
var shelljs = require('shelljs');
var IonicAppLib = require('ionic-app-lib');
var IonicProject = IonicAppLib.project;
var State = IonicAppLib.state;
var log = IonicAppLib.logging.logger;
var appLibUtils = IonicAppLib.utils;

shelljs.config.silent = true;

var settings = {
  title: 'state',
  name: 'state',
  summary: 'Saves or restores state of your Ionic Application using the package.json file',
  args: {
    '<COMMAND>': '[ save | restore | clear | reset ]'
  },
  options: {
    save: 'Save the platforms and plugins into package.json',
    restore: 'Restore the platforms and plugins from package.json',
    clear: 'Clear the package.json of cordovaPlugins and cordovaPlatforms, ' +
      'as well as clear out the platforms and plugins folders',
    reset: 'Clear out the platforms and plugins directories, and reinstall plugins and platforms',
    '--plugins': {
      title: 'Only do operations with plugins',
      boolean: true
    },
    '--platforms': {
      title: 'Only do operations with platforms',
      boolean: true
    }
  },
  isProjectTask: true
};

function run(ionic, argv) {
  var options = { platforms: true, plugins: true };

  try {
    IonicProject.load();
  } catch (ex) {
    appLibUtils.fail(ex.message);
    return;
  }

  // If either plugin or platforms is specified, set it to that value.
  if (argv.platforms || argv.plugins) {
    options = { platforms: argv.platforms, plugins: argv.plugins };
  }

  switch (argv._[1]) {
  case 'save':
    State.saveState(process.cwd(), options);
    break;
  case 'restore':
    State.restoreState(process.cwd(), options);
    break;
  case 'reset':
    State.resetState(process.cwd(), options);
    break;
  case 'clear':
    State.clearState(process.cwd(), options);
    break;
  default:
    log.error('Please specify a command [ save | restore | reset | clear ] for the state command.');
  }
}

module.exports = extend(settings, {
  run: run
});
