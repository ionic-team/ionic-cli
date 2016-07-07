'use strict';

var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var State = IonicAppLib.state;
var log = IonicAppLib.logging.logger;
var cordovaUtils = require('../utils/cordova');

var settings = {
  title: 'plugin add',
  name: 'plugin',
  summary: 'Add a Cordova plugin',
  args: {
    '[options]': '',
    '<SPEC>': 'Can be a plugin ID, a local path, or a git URL.'
  },
  options: {
    '--searchpath <directory>': 'When looking up plugins by ID, look in this directory\n' +
                                'and subdirectories first for the plugin before\n' +
                                'looking it up in the registry.',
    '--nosave|-e': {
      title: 'Do not save the plugin to the package.json file',
      boolean: true
    }
  },
  isProjectTask: true
};

function run(ionic, argv, rawCliArguments) {
  var appDirectory = process.cwd();
  var rawArgs = rawCliArguments.slice(0);
  var cmdName = settings.name;
  var argumentName = argv._[2];

  var isAddCmd = argv._.indexOf('add') !== -1;
  var isRmCmd = argv._.indexOf('rm') !== -1 || argv._.indexOf('remove') !== -1;

  // ensure the content node was set back to its original
  return ConfigXml.setConfigXml(appDirectory, {
    resetContent: true,
    errorWhenNotFound: false
  })
  .then(function() {
    var optionList = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawArgs);
    return cordovaUtils.execCordovaCommand(optionList);
  })
  .then(function(runCode) {

    // We dont want to do anything if the cordova command failed
    if (runCode !== 0 || argv.nosave) {
      return;
    }

    // Is the plugin being added
    if (isAddCmd) {
      var variables;

      log.info('Saving plugin to package.json file');
      if (argv.variable && (typeof argv.variable === 'string')) {
        variables = [argv.variable];
      } else {
        variables = argv.variable;
      }
      return State.savePlugin(appDirectory, argumentName, variables);
    }

    // Is the plugin being removed
    if (isRmCmd) {
      log.info('Removing plugin from package.json file');
      return State.removePlugin(appDirectory, argumentName);
    }
  })
  .catch(function(ex) {
    if (ex instanceof Error) {
      log.error(ex);
    }
  });
}

module.exports = extend(settings, {
  run: run
});
