'use strict';

var _ = require('underscore');
var fs = require('fs');
var os = require('os');
var Q = require('q');
var path = require('path');
var exec = require('child_process').exec;
var IonicAppLib = require('ionic-app-lib');
var IonicResources = IonicAppLib.resources;
var ConfigXml = IonicAppLib.configXml;
var Cordova = IonicAppLib.cordova;
var State = IonicAppLib.state;
var Utils = IonicAppLib.utils;
var log = IonicAppLib.logging.logger;
var Serve = IonicAppLib.serve;
var IonicProject = IonicAppLib.project;

var settings = {
  title: 'compile',
  name: 'compile'
};

function checkIfPlatformInstalled(platform) {
  platform = platform || 'ios';

  var platformPath = path.join(process.cwd(), 'platforms', platform);

  try {
    fs.statSync(platformPath);
    return true;
  } catch (ex) {
    return false;
  }
}

function checkForPlugins() {
  var pluginPath = path.join(process.cwd(), 'plugins');

  try {
    fs.statSync(pluginPath);
    return true;
  } catch (ex) {
    return false;
  }
}

function run(ionic, argv) {
  var cmdName = process.argv[2].toLowerCase();
  var appDirectory = process.cwd();
  var q;

  try {

    // Patch - before doing a `ionic run ios`, we need to make sure they have that platform installed.
    // if not, try to install it.
    if (argv._.indexOf('run') !== -1 || argv._.indexOf('build') !== -1 || argv._.indexOf('emulate') !== -1) {

      if (runPlatform === 'ios' && os.platform() !== 'darwin') {
        return log.error('✗ You cannot run iOS unless you are on Mac OSX.');
      }

      var runPlatform = argv._[1] || 'ios';
      var platformInstalled = checkIfPlatformInstalled(runPlatform);
      var pluginsInstalled = checkForPlugins();

      if (!platformInstalled) {
        var notInstalledMsg = [
          '• You\'re trying to build for ',
          runPlatform,
          ', but don\'t have the platform installed yet.'
        ].join('').yellow;
        var installingMsg = ['∆ Installing ', runPlatform, ' for you.'].join('');
        var installedMessage = ['√ Installed platform ', runPlatform].join('');
        var installCmd = 'cordova platform add ' + runPlatform;

        log.info(notInstalledMsg);
        log.info(installingMsg);

        exec(installCmd);

        log.info(installedMessage);
      }

      if (!pluginsInstalled) {
        q = Q(true);
      } else {
        q = Q(false);
      }
    } else {
      q = Q(false);
    }

    this.isLiveReload = ((cmdName === 'run' || cmdName === 'emulate') &&
                         (argv.livereload || argv['live-reload'] || argv.l));

    this.addIcons = !(argv.noresources || argv.r);

    var addDefaultResources = false;
    var isPlatformCmd = argv._.indexOf('platform') !== -1 || argv._.indexOf('platforms') !== -1;
    var isAddCmd = argv._.indexOf('add') !== -1;
    var isPluginCmd = argv._.indexOf('plugin') !== -1 || argv._.indexOf('plugins') !== -1;
    var isRmCmd = argv._.indexOf('rm') !== -1 || argv._.indexOf('remove') !== -1;

    // if (isAddCmd || isRmCmd) {
    //   ('this this this', isAddCmd, isRmCmd)
    //   Hooks.setHooksPermission(process.cwd());
    // }

    if (isPlatformCmd && isAddCmd) {
      addDefaultResources = true;
    }

    return q.then(function(installPlugins) {
      if (!installPlugins) {
        return;
      }
      var plugins = [
        'cordova-plugin-device',
        'cordova-plugin-console',
        'cordova-plugin-whitelist',
        'cordova-plugin-splashscreen',
        'cordova-plugin-statusbar',
        'ionic-plugin-keyboard'
      ];

      plugins.forEach(function(plugin) {
        log.info(['Installing ', plugin].join(''));
        exec('cordova plugin add --save' + plugin);
      });
    })
    .then(function() {
      if (isLiveReload) {
        return setupLiveReload(argv);
      } else {

        // ensure the content node was set back to its original
        return ConfigXml.setConfigXml(process.cwd(), {
          resetContent: true,
          errorWhenNotFound: false
        });
      }
    })
    .then(function(serveOptions) {
      if (isLiveReload) {
        options = serveOptions;
      }
      if (addDefaultResources && addIcons) {
        return IonicResources.copyIconFilesIntoResources(appDirectory)
        .then(function() {
          return IonicResources.addIonicIcons(appDirectory, argv._[2]);
        });
      } else {
        return false;
      }
    })
    .then(function() {
      return runCordova(cmdName, argv);
    })
    .then(function(runCode) {

      // We dont want to do anything if the cordova command failed
      if (runCode !== 0 || argv.nosave) {
        return;
      }
      var argumentName = argv._[2];
      if (isPlatformCmd && isAddCmd) {
        addDefaultResources = true;
        log.info('Saving platform to package.json file');

        return State.savePlatform(process.cwd(), argumentName);
      } else if (isPlatformCmd && isRmCmd) {
        log.info('Removing platform from package.json file');

        return State.removePlatform(process.cwd(), argumentName);
      } else if (isPluginCmd && isAddCmd) {
        var variables;

        log.info('Saving plugin to package.json file');
        if (argv.variable && (typeof argv.variable === 'string')) {
          variables = [argv.variable];
        } else {
          variables = argv.variable;
        }
        return State.savePlugin(process.cwd(), argumentName, variables);
      } else if (isPluginCmd && isRmCmd) {
        log.info('Removing plugin from package.json file');
        return State.removePlugin(process.cwd(), argumentName);
      }
    })
    .catch(function(ex) {
      log.error('Error happened', ex);
      log.error(ex.stack);
      throw ex;
    });
  } catch (ex) {
    Utils.fail('An error occurred running a Cordova command:' + ex);
  }
}

function runCordova(cmdName, argv) {
  var deferred = Q.defer();
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);
  var cmdArg;
  var x;
  var y;

  // backwards compatibility prior to fully wrapping cordova cmds
  if (cmdName === 'platform' && cmdArgs.length > 0) {

    // `ionic platform <PLATFORM>` used to actually run `ionic platform add <PLATFORM>`
    // if a cordova platform cmd isn't the cmd then automatically insert `add`
    var hasCordovaCmd = false;
    var validCommands = 'add remove rm list ls update up check'.split(' ');
    for (x = 0; x < cmdArgs.length; x += 1) {
      cmdArg = cmdArgs[x].toLowerCase();
      for (y = 0; y < validCommands.length; y += 1) {
        if (cmdArg === validCommands[y]) {
          hasCordovaCmd = true;
          break;
        }
      }
    }

    if (!hasCordovaCmd) {
      cmdArgs.unshift('add');
    }
  }

  cmdArgs.unshift(cmdName);

  // clean out any cmds that may confuse cordova
  var cleanArgs = [];
  var port = argv.port || argv.p || '';
  var liveReloadPort = argv.livereloadport || argv['livereload-port'] || argv.r || '';
  var ignoreCmds = '--livereload -l --consolelogs -c --serverlogs -s --port -p --livereload-port' +
    ' -i -r --address'.split(' ');
  var isValdCmd;
  var foundAddressCmd = false;

  for (x = 0; x < cmdArgs.length; x += 1) {
    cmdArg = cmdArgs[x];
    if (port && cmdArg === port) continue;
    if (liveReloadPort && cmdArg === liveReloadPort) continue;
    isValdCmd = true;
    for (y = 0; y < ignoreCmds.length; y += 1) {
      if (cmdArg === ignoreCmds[y]) {
        isValdCmd = false;

        // if address is passed, the arg after it will need to be taken out as well.
        // also note, if they use --address="localhost", this will not happen
        if (cmdArg === '--address') {
          foundAddressCmd = true;
        }
        break;
      }
    }
    if (isValdCmd && !foundAddressCmd) {

      // make sure --target= has double quotes around it (process.argv removes them)
      if (cmdArg.indexOf('--target=') === 0 && cmdArg.indexOf('"') === -1) {
        cmdArg = cmdArg.replace('--target=', '--target="') + '"';
      }

      cleanArgs.push(cmdArg);
    } else {
      foundAddressCmd = true;
    }
  }
  var cordovaIsInstalled = Utils.cordovaInstalled();

  log.debug('Cordova is installed:', cordovaIsInstalled);
  if (!cordovaIsInstalled) {
    log.debug('Executing cordova without CLI: ' + cleanArgs);

    // If no cordova CLI is installed, fall back to local cordova-lib.
    // TODO: Add ability to be smart = only use this if cordova CLI is not installed.
    // TODO: Enable passing variables with the plugins
    // TODO: Enable checking for multiple platforms/plugins/ls
    // ex: (multiple plugin ids) ionic plugin add cordova-plugin-camera cordova-plugin-geolocation
    //    (multiple platforms) ionic platform add ios android
    //    (listing) ionic plugin ls
    //    (version) ionic platform add ios@8.1.1
    //    (variables) ionic plugin add cordova-plugin-facebook --variable APP_ID=1 --variable APP_NAME="Goofballs"
    try {
      var promise;
      if (cleanArgs[0] === 'run') {
        promise = Cordova.runPlatform(process.cwd(), cleanArgs[1]);
      } else if (cleanArgs[0] === 'platform') {
        if (cleanArgs[1] === 'add') {
          promise = Cordova.addPlatform(process.cwd(), cleanArgs[2], true);
        } else if (cleanArgs[1] === 'remove') {
          promise = Cordova.removePlatform(process.cwd(), cleanArgs[2], true);
        }
      } else if (cleanArgs[0] === 'plugin') {
        if (cleanArgs[1] === 'add') {
          promise = Cordova.addPlugin(process.cwd(), cleanArgs[2], null, true);
        } else if (cleanArgs[1] === 'remove') {
          promise = Cordova.removePlugin(process.cwd(), cleanArgs[2]);
        }
      }

      return promise.then(function(result) {
        log.info('cleanArgs[0]', cleanArgs[0], 'completed');
        log.debug('Result from cordova-lib:', result);
        deferred.resolve(result);
      })
      .catch(function(ex) {
        deferred.reject(ex);
      });
    } catch (ex) {
      log.error('An Error occurred trying to fall back to Cordova-lib execution:', ex);
      throw ex;
    }
  }

  log.debug('Executing cordova cli: ' + cleanArgs.join(' '));
  var cordovaProcess = exec('cordova ' + cleanArgs.join(' '));

  cordovaProcess.stdout.on('data', function(data) {
    process.stdout.write(data);
  });

  cordovaProcess.stderr.on('data', function(data) {
    if (data) {
      process.stderr.write(data.toString().bold);
    }
  });

  cordovaProcess.on('close', function(code) {
    deferred.resolve(code);
  });

  if (isLiveReload) {
    cordovaProcess.on('exit', function() {

      Serve.printCommandTips(options);
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


function setupLiveReload(argv) {
  var d = Q.defer();

  log.info('Setup Live Reload'.green.bold);

  var project = null;

  try {
    var cwd = process.cwd();
    project = IonicProject.load(cwd);
  } catch (ex) {
    log.info('Error occured', ex);
    return Utils.fail(ex.message);
  }

  var options = Serve.loadSettings(argv, project);

  // options.address = '0.0.0.0';
  options.appDirectory = process.cwd(); // called from cli - ionic serve - cwd is this
  options.runLivereload = true;
  options.launchBrowser = false;
  options.launchLab = false;
  options.isPlatformServe = true;

  // First ask user for the IP selection
  // Check ports not used
  // Set up config.xml src url
  // run the cordova command

  var promise;

  if (argv.all) {
    promise = Q();
    log.info('Defaulting address to 0.0.0.0');
    options.address = '0.0.0.0';
  } else if (argv.address) {
    options.address = argv.address;
    promise = Q();
  } else {
    promise = Serve.getAddress(options);
  }

  return promise
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
    ConfigXml.setConfigXml(process.cwd(), {
      devServer: Serve.host(options.address, options.port)
    }).then(function() {
      d.resolve();
    });
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


module.exports = _.extend(settings, {
  run: run
});
