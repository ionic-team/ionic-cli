'use strict';

var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var IonicResources = IonicAppLib.resources;
var ConfigXml = IonicAppLib.configXml;
var State = IonicAppLib.state;
var log = IonicAppLib.logging.logger;
var cordovaUtils = require('../utils/cordova');

var settings = {
  title: 'platform',
  name: 'platform',
  summary: 'Add platform target for building an Ionic app',
  args: {
    '<PLATFORM>': '',
    '[options]': ''
  },
  options: {
    '--noresources|-r': {
      title: 'Do not add default Ionic icons and splash screen resources',
      boolean: true
    },
    '--nosave|-e': {
      title: 'Do not save the platform to the package.json file',
      boolean: true
    }
  },
  isProjectTask: true
};

function run(ionic, argv, rawCliArguments) {
  var appDirectory = process.cwd();
  var cmdName = process.argv[2].toLowerCase();
  var rawArgs = rawCliArguments.slice(0);
  var argumentName = argv._[2];

  var isAddCmd = argv._.indexOf('add') !== -1;
  var isRmCmd = argv._.indexOf('rm') !== -1 || argv._.indexOf('remove') !== -1;
  var addResources = isAddCmd &&  !(argv.noresources || argv.r);

  // ensure the content node was set back to its original
  return ConfigXml.setConfigXml(appDirectory, {
    resetContent: true,
    errorWhenNotFound: false
  })
  .then(function() {
    if (addResources) {
      return IonicResources.copyIconFilesIntoResources(appDirectory)
        .then(function() {
          return IonicResources.addIonicIcons(appDirectory, argumentName);
        });
    }
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

    if (isAddCmd) {
      log.info('Saving platform to package.json file');
      return State.savePlatform(appDirectory, argumentName);
    }
    if (isRmCmd) {
      log.info('Removing platform from package.json file');
      return State.removePlatform(appDirectory, argumentName);
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
