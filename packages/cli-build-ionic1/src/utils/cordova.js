'use strict';

var chalk = require('chalk');
var Q = require('q');
var _ = require('underscore');
var IonicAppLib = require('ionic-app-lib');
var Serve = IonicAppLib.serve;
var Project = IonicAppLib.project;
var log = IonicAppLib.logging.logger;
var ConfigXml = IonicAppLib.configXml;

/**
 * Setup the live reload server for ionic
 *
 * @param {Array} argv List of arguments
 * @param {String} baseDir The projects base directory
 * @param {Obj} options options for live reload function
 * @return {Promise} Promise upon completion
 */
function setupLiveReload(argv, baseDir) {
  log.info(chalk.green.bold('Setup Live Reload'));

  var project = Project.load(baseDir);
  var options = _.extend(Serve.loadSettings(argv, project), {
    appDirectory: baseDir,
    runLivereload: true,
    launchBrowser: false,
    launchLab: false,
    isPlatformServe: true
  });


  // First ask user for the IP selection
  // Check ports not used
  // Set up config.xml src url
  // run the cordova command

  var promises = [];

  if (argv.all) {
    log.info('Defaulting address to 0.0.0.0');
    options.address = '0.0.0.0';
  } else if (argv.address) {
    options.address = argv.address;
  } else {
    promises = promises.concat(Serve.getAddress(options));
  }

  return Q.all(promises)
  .then(function() {
    options.devServer = Serve.host(options.address, options.port);
    return Serve.checkPorts(true, options.port, options.address, options);
  })
  .then(function() {
    if (options.runLivereload) {
      return Serve.checkPorts(false, options.liveReloadPort, options.address, options);
    }
  })
  .then(function() {
    return ConfigXml.setConfigXml(process.cwd(), {
      devServer: Serve.host(options.address, options.port)
    });
  })
  .then(function() {
    return Serve.start(options);
  })
  .then(function() {
    Serve.showFinishedServeMessage(options);
    return options;
  })
  .catch(function(error) {
    log.info('There was an error serving your Ionic application for run', error);
    log.info(error.stack);
    throw error;
  });
}

module.exports = {
  setupLiveReload: setupLiveReload,
};
