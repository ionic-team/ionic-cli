'use strict';

var chalk = require('chalk');
var Q = require('q');
var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var IonicAppLib = require('ionic-app-lib');
var Serve = IonicAppLib.serve;
var Project = IonicAppLib.project;
var log = IonicAppLib.logging.logger;
var ConfigXml = IonicAppLib.configXml;
var crossSpawn = require('cross-spawn');
var npmScripts = require('../utils/npmScripts');
var serveUtils = require('../utils/serve');


function promiseSpawn(cmd, args) {
  var deferred = Q.defer();
  var info = '';

  try {
    var proc = crossSpawn.spawn(cmd, args);

    proc.stdout.on('data', function(data) {
      info += data.toString('utf8');
    });

    proc.on('error', function(error) {
      deferred.reject(error);
    });

    proc.on('close', function(code) {
      if (code !== 0) {
        return deferred.reject(code);
      }
      deferred.resolve(info.replace('\n', ' '));
    });
  } catch (e) {
    return deferred.reject(e);
  }

  return deferred.promise;
}

/**
 * Returns true or false after checking if the platform exists
 * Synchronous
 *
 * @param {String} platform The platform to check for
 * @param {String} baseDir The projects base directory
 * @return {Boolean} True if platform is installed
 */
function isPlatformInstalled(platform, baseDir) {
  var deferred = Q.defer();
  var platformPath = path.join(baseDir, 'platforms', platform);

  try {
    fs.stat(platformPath, function(err) {
      if (err) {
        return deferred.resolve(false);
      }
      return deferred.resolve(true);
    });
  } catch (ex) {
    deferred.resolve(false);
  }

  return deferred.promise;
}

/**
 * Returns true or false after checking if any plugin is installed
 * Synchronous
 *
 * @param {String} baseDir The projects base directory
 * @return {Boolean} True if any plugin is installed
 */
function arePluginsInstalled(baseDir) {
  var deferred = Q.defer();
  var pluginPath = path.join(baseDir, 'plugins');

  try {
    fs.stat(pluginPath, function(err) {
      if (err) {
        return deferred.resolve(false);
      }
      return deferred.resolve(true);
    });
  } catch (ex) {
    deferred.resolve(false);
  }

  return deferred.promise;
}

/**
 * Install ionic required plugins
 *
 * @return {Promise} Promise upon completion
 */
function installPlugins() {
  var plugins = [
    'cordova-plugin-device',
    'cordova-plugin-console',
    'cordova-plugin-whitelist',
    'cordova-plugin-splashscreen',
    'cordova-plugin-statusbar',
    'ionic-plugin-keyboard'
  ];

  return Q.all(plugins.map(function(plugin) {
    log.info(['Installing ', plugin].join(''));
    return promiseSpawn('cordova', ['plugin', 'add', '--save', plugin]);
  }));
}

/**
 * Install the platform specified using cordova
 *
 * @param {String} platform The platform to install (ios, android, etc.)
 * @return {Promise} Promise upon completion
 */
function installPlatform(platform) {
  log.info(chalk.yellow('• You\'re trying to build for ' + platform + ' but don\'t have the platform installed yet.'));
  log.info('∆ Installing ' + platform + ' for you.');

  return promiseSpawn('cordova', ['platform', 'add', platform]).then(function() {
    log.info('√ Installed platform ' + platform);
  });
}

function execCordovaCommand(optionList, isLiveReload, serveOptions) {
  var deferred = Q.defer();
  isLiveReload = !!isLiveReload;

  log.debug('Executing cordova cli: ' + optionList.join(' '));
  var cordovaProcess = crossSpawn.spawn('cordova', optionList);

  cordovaProcess.stdout.on('data', function(data) {
    log.info(data.toString());
  });

  cordovaProcess.stderr.on('data', function(data) {
    if (data) {
      log.error(chalk.bold(data.toString()));
    }
  });

  cordovaProcess.on('close', function(code) {
    if (code > 0) {
      return deferred.reject(code);
    }
    return deferred.resolve();
  });

  if (isLiveReload) {
    cordovaProcess.on('exit', function() {

      setTimeout(function() {

        // set it back to the original src after a few seconds
        ConfigXml.setConfigXml(process.cwd(), {
          resetContent: true,
          errorWhenNotFound: true
        });

        // deferred.resolve();
      }, 5000);
    });

    process.on('exit', function() {

      // verify it was set back
      ConfigXml.setConfigXml(process.cwd(), {
        resetContent: true,
        errorWhenNotFound: false
      });
    });

    var readLine = require('readline');
    if (process.platform === 'win32') {
      var rl = readLine.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.on('SIGINT', function() {
        process.emit('SIGINT');
      });
    }

    process.on('SIGINT', function() {
      process.exit();
    });
  }

  return deferred.promise;
}


/**
 * Filter and gather arguments from command line to be passed to Cordova
 *
 * @param {String} cmdName The command that is being executed (ie run, build, etc)
 * @param {Object} argv An optimist object
 * @return {Array} Returns a list of commands to use with cordova
 */
function filterArgumentsForCordova(cmdName, argv, rawCliArguments) {

  // clean out any cmds that may confuse cordova
  var port = argv.port || argv.p || '';
  var liveReloadPort = argv.livereloadport || argv['livereload-port'] || argv.r || '';
  var ignoreCmds = [
    '--livereload', '-l',
    '--consolelogs', '-c',
    '--serverlogs', '-s',
    '--port', '-p',
    '--livereload-port',
    '-i', '-r'
  ];

  return rawCliArguments.filter(function(arg, index, fullList) {

    // Remove address parameter and the param that follows it
    if (arg === '--address' || fullList[index - 1] === '--address') { return false; }

    // If arg is equal to what we identifed as the port reject it
    if (port && parseInt(arg, 10) === parseInt(port, 10)) { return false; }

    // If arg is equal to what we identifed as the liveReloadPort reject it
    if (liveReloadPort && parseInt(arg, 10) === parseInt(liveReloadPort, 10)) { return false; }

    // Only return true if the arg is not found in the ignore Cmds list
    return ignoreCmds.indexOf(arg) === -1;
  });
}

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

/**
 * Start the app scripts server for emulator or device
 *
 * @param {Number} port
 * @param {String} address
 * @return {Promise} Promise upon completion
 */
function startAppScriptsServer(argv) {
  var options = _.extend(argv, {
    runLivereload: true,
    isPlatformServe: true
  });
  options = npmScripts.consolidateOptions(['port', 'p'], options);
  options = npmScripts.consolidateOptions(['livereload-port', 'r'], options);
  options = npmScripts.consolidateOptions(['consolelogs', 'c'], options);
  options = npmScripts.consolidateOptions(['serverlogs', 's'], options);
  options = npmScripts.consolidateOptions(['livereload', 'l'], options);

  options.port = options.port || serveUtils.DEFAULT_HTTP_PORT;
  options['livereload-port'] = options['livereload-port'] || serveUtils.DEFAULT_LIVE_RELOAD_PORT;

  return Serve.getAddress(options)
  .then(function() {

    // Check that the server port is available
    return serveUtils.findClosestOpenPort(options.address, options.port);
  })
  .then(function(foundPort) {
    options.port = foundPort;

    // Check that the liveReload port is available
    return serveUtils.findClosestOpenPort(options.address, options['livereload-port']);
  })
  .then(function(foundPort) {
    options['livereload-port'] = foundPort;

    // Execute the serve command from app-scripts
    // Also remove platform from the raw args passed
    return npmScripts.runIonicScript('serve',
      npmScripts.optionsToArray(options)

      // Serve specific options not related to the actual run or emulate code
      .concat([
        '--iscordovaserve',
        '--nobrowser'
      ])
    );
  })
  .then(function() {
    return ConfigXml.setConfigXml(process.cwd(), {
      devServer: Serve.host(options.address, options.port)
    });
  });
}

module.exports = {
  isPlatformInstalled: isPlatformInstalled,
  arePluginsInstalled: arePluginsInstalled,
  installPlatform: installPlatform,
  installPlugins: installPlugins,
  execCordovaCommand: execCordovaCommand,
  filterArgumentsForCordova: filterArgumentsForCordova,
  setupLiveReload: setupLiveReload,
  startAppScriptsServer: startAppScriptsServer
};
