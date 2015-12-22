var Task = require('./task').Task,
    fs = require('fs'),
    os = require('os'),
    Q = require('q'),
    // argv = require('optimist').boolean(['nohooks', 'n', 'r', 'noresources', 'nosave', 'e']).argv,
    path = require('path'),
    exec = require('child_process').exec,
    colors = require('colors'),
    shelljs = require('shelljs'),
    prompt = require('prompt'),
    IonicAppLib = require('ionic-app-lib'),
    IonicResources = IonicAppLib.resources,
    ConfigXml = IonicAppLib.configXml,
    Cordova = IonicAppLib.cordova,
    Hooks = IonicAppLib.hooks,
    State = IonicAppLib.state,
    Utils = IonicAppLib.utils,
    Logging = IonicAppLib.logging;

var IonicTask = function() {};
IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  this.ionic = ionic;

  var self = this,
      cmdName = process.argv[2].toLowerCase(),
      appDirectory = process.cwd(),
      q;

  if (argv.v2) {
    Serve = IonicAppLib.v2.serve;
    IonicProject = IonicAppLib.v2.project;
  } else {
    Serve = IonicAppLib.serve;
    IonicProject = IonicAppLib.project;
  }

  try {
    // Patch - before doing a `ionic run ios`, we need to make sure they have that platform installed.
    // if not, try to install it.
    if (argv._.indexOf('run') != -1 || argv._.indexOf('build') != -1 || argv._.indexOf('emulate') != -1) {

      if (runPlatform == 'ios' && os.platform() !== 'darwin') {
        return Logging.logger.info('✗ You cannot run iOS unless you are on Mac OSX.'.red);
      }

      var runPlatform = argv._[1] || 'ios',
          platformInstalled = self.checkIfPlatformInstalled(runPlatform),
          pluginsInstalled = self.checkForPlugins();

      if (!platformInstalled) {
        var notInstalledMsg = ['• You\'re trying to build for ', runPlatform, ', but don\'t have the platform installed yet.'].join('').yellow,
          installingMsg = ['∆ Installing ', runPlatform, ' for you.'].join('').blue,
          installedMessage = ['√ Installed platform ', runPlatform].join('').green,
          installCmd = 'ionic platform add ' + runPlatform;
        Logging.logger.info(notInstalledMsg);
        Logging.logger.info(installingMsg);
        // Logging.logger.info(installCmd);
        shelljs.exec(installCmd);
        Logging.logger.info(installedMessage);
      }

      if (!pluginsInstalled) {
        q = Q(true);
      } else {
        q = Q(false);
      }
    } else {
      q = Q(false);
    }

    this.isLiveReload = ((cmdName == 'run' || cmdName == 'emulate') && (argv.livereload || argv['live-reload'] || argv.l));

    this.addIcons = !(argv.noresources || argv.r);

    var addDefaultResources = false;
    var isPlatformCmd = argv._.indexOf('platform') != -1 || argv._.indexOf('platforms') != -1;
    var isAddCmd = argv._.indexOf('add') != -1;
    var isPluginCmd = argv._.indexOf('plugin') != -1 || argv._.indexOf('plugins') != -1;
    var isRmCmd = argv._.indexOf('rm') != -1 || argv._.indexOf('remove') != -1;

    // if (isAddCmd || isRmCmd) {
    //   console.log('this this this', isAddCmd, isRmCmd)
    //   Hooks.setHooksPermission(process.cwd());
    // }

    if(isPlatformCmd && isAddCmd) {
      addDefaultResources = true;
    }

    return q.then(function(installPlugins) {
      if (!installPlugins) {
        return;
      }
      var plugins = [
        "cordova-plugin-device",
        "cordova-plugin-console",
        "cordova-plugin-whitelist",
        "cordova-plugin-splashscreen",
        "cordova-plugin-statusbar",
        "ionic-plugin-keyboard"
      ];

      plugins.forEach(function(plugin) {
        Logging.logger.info(['Installing ', plugin].join('').blue);
        shelljs.exec('ionic plugin add ' + plugin);
      });
    })
    .then(function() {
      if(self.isLiveReload) {
        return self.setupLiveReload(argv);
      } else {
        // ensure the content node was set back to its original
        return self.ionic.setConfigXml({
          resetContent: true,
          errorWhenNotFound: false
        });
      }
    })
    .then(function(serveOptions){
      if (self.isLiveReload) {
        self.options = serveOptions;
      }
      if(addDefaultResources && self.addIcons) {
        return IonicResources.copyIconFilesIntoResources(appDirectory)
        .then(function() {
          return IonicResources.addIonicIcons(appDirectory, argv._[2]);
        })
      } else {
        return false;
      }
    })
    .then(function(){
      // TODO :(
      if (  argv.v2 &&
            !self.isLiveReload &&
            !argv.b && !argv.nobundle &&
            (cmdName === 'build' || cmdName === 'emulate' || cmdName === 'run' || cmdName === 'upload'))
      {
        var Build = IonicAppLib.v2.build;
        var config = null;
        try {
          config = require(process.cwd() + path.sep + 'ionic.config.js');
        } catch (e) {}
        var buildOptions = {
          appDirectory: process.cwd(),
          callback: function() {
            console.log('√ Compiling files complete.'.green.bold);
          },
          watch: false,
          config: config
        };
        // can happen parallel to webpack bundle
        Build.sass(buildOptions);
        Build.fonts(buildOptions);
        Build.html(buildOptions);
        return Build.bundle(buildOptions);
      }
    })
    .then(function() {
      return self.runCordova(cmdName, argv);
    })
    .then(function(runCode) {
      //We dont want to do anything if the cordova command failed
      if(runCode !== 0 || argv.nosave) {
        return
      }
      var argumentName = argv._[2];
      if (isPlatformCmd && isAddCmd) {
        addDefaultResources = true;
        console.log('Saving platform to package.json file'.blue)
        return State.savePlatform(process.cwd(), argumentName);
      } else if (isPlatformCmd && isRmCmd) {
        console.log('Removing platform from package.json file'.blue)
        return State.removePlatform(process.cwd(), argumentName);
      } else if (isPluginCmd && isAddCmd) {
        console.log('Saving plugin to package.json file'.blue)
        var variables;
        if (argv.variable && (typeof argv.variable == 'string')) {
          variables = [argv.variable];
        } else {
          variables = argv.variable;
        }
        return State.savePlugin(process.cwd(), argumentName, variables);
      } else if (isPluginCmd && isRmCmd) {
        console.log('Removing plugin from package.json file'.blue)
        return State.removePlugin(process.cwd(), argumentName);
      }
    })
    .catch(function(ex) {
      console.log('Error happened', ex)
      console.log(ex.stack);
      throw ex;
    });
  } catch (ex) {
    Utils.fail('An error occurred running a Cordova command:' + ex);
  }
}

IonicTask.prototype.runCordova = function(cmdName, argv) {
  var deferred = Q.defer();
  var self = this;
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);
  var cmdArg, x, y;

  // backwards compatibility prior to fully wrapping cordova cmds
  if(cmdName == 'platform' && cmdArgs.length > 0 ) {
    // `ionic platform <PLATFORM>` used to actually run `ionic platform add <PLATFORM>`
    // if a cordova platform cmd isn't the cmd then automatically insert `add`
    var hasCordovaCmd = false;
    var validCommands = 'add remove rm list ls update up check'.split(' ');
    for(x=0; x<cmdArgs.length; x++) {
      cmdArg = cmdArgs[x].toLowerCase();
      for(y=0; y<validCommands.length; y++) {
        if(cmdArg == validCommands[y]) {
          hasCordovaCmd = true;
          break;
        }
      }
    }

    if(!hasCordovaCmd) {
      cmdArgs.unshift('add');
    }
  }

  cmdArgs.unshift(cmdName);

  // clean out any cmds that may confuse cordova
  var cleanArgs = [];
  var port = argv.port || argv.p || '';
  var liveReloadPort = argv.livereloadport || argv['livereload-port'] || argv.r || '';
  var ignoreCmds = '--livereload -l --consolelogs -c --serverlogs -s --port -p --livereload-port -i -r --address'.split(' ');
  var isValdCmd,
      foundAddressCmd = false;
  for(x=0; x<cmdArgs.length; x++) {
    cmdArg = cmdArgs[x];
    if(port && cmdArg == port) continue;
    if(liveReloadPort && cmdArg == liveReloadPort) continue;
    isValdCmd = true;
    for(y=0; y<ignoreCmds.length; y++) {
      if(cmdArg == ignoreCmds[y]) {
        isValdCmd = false;
        //if address is passed, the arg after it will need to be taken out as well.
        //also note, if they use --address="localhost", this will not happen
        if (cmdArg === '--address') {
          foundAddressCmd = true;
        }
        break;
      }
    }
    if(isValdCmd && !foundAddressCmd) {
      // make sure --target= has double quotes around it (process.argv removes them)
      if(cmdArg.indexOf('--target=') === 0 && cmdArg.indexOf('"') === -1) {
        cmdArg = cmdArg.replace('--target=', '--target="') + '"';
      }

      cleanArgs.push(cmdArg);
    } else {
      foundAddressCmd = true;
    }
  }
  var cordovaIsInstalled = Utils.cordovaInstalled();

  Logging.logger.debug('Cordova is installed:', cordovaIsInstalled);
  if (!cordovaIsInstalled) {
    Logging.logger.debug('Executing cordova without CLI: ' + cleanArgs);
    //If no cordova CLI is installed, fall back to local cordova-lib.
    //TODO: Add ability to be smart = only use this if cordova CLI is not installed.
    //TODO: Enable passing variables with the plugins
    //TODO: Enable checking for multiple platforms/plugins/ls
    //ex: (multiple plugin ids) ionic plugin add cordova-plugin-camera cordova-plugin-geolocation
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
        Logging.logger.info('cleanArgs[0]', cleanArgs[0], 'completed');
        Logging.logger.debug('Result from cordova-lib:', result);
        deferred.resolve(result);
      })
      .catch(function(ex) {
        deferred.reject(ex);
      });
    } catch (ex) {
      Logging.logger.error('An Error occurred trying to fall back to Cordova-lib execution:', ex);
      throw ex;
    }
  }

  Logging.logger.debug('Executing cordova cli: ' + cleanArgs.join(' '));
  var cordovaProcess = exec('cordova ' + cleanArgs.join(' '));

  cordovaProcess.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  cordovaProcess.stderr.on('data', function (data) {
    if(data) {
      process.stderr.write(data.toString().error.bold);
    }
  });

  cordovaProcess.on('close', function(code) {
    deferred.resolve(code);
  });

  if(self.isLiveReload) {
    cordovaProcess.on('exit', function(){
      // Serve.showFinishedServeMessage(self.options);
      Serve.printCommandTips(self.options);
      setTimeout(function(){
        // set it back to the original src after a few seconds
        ConfigXml.setConfigXml(process.cwd(), {
          resetContent: true,
          errorWhenNotFound: true
        });
        // deferred.resolve();
      }, 5000);
    });

    process.on('exit', function(){
      // verify it was set back
      self.ionic.setConfigXml( process.cwd(), {
        resetContent: true,
        errorWhenNotFound: false
      });
    });

    var readLine = require("readline");
    if(process.platform === "win32") {
      var rl = readLine.createInterface ({
          input: process.stdin,
          output: process.stdout
      });

      rl.on("SIGINT", function (){
        process.emit("SIGINT");
      });
    }

    process.on("SIGINT", function(){
      process.exit();
    });
  }

  return deferred.promise;
};


IonicTask.prototype.setupLiveReload = function(argv) {
  var d = Q.defer();

  console.log('Setup Live Reload'.green.bold);

  var project = null;

  try {
    var cwd = process.cwd();
    project = argv.v2 ? IonicProject.loadConfig(cwd) : IonicProject.load(cwd);
  } catch (ex) {
    console.log('Error occured', ex);
    return Utils.fail(ex.message);
  }

  var options = Serve.loadSettings(argv, project);
  // options.address = '0.0.0.0';
  options.appDirectory = process.cwd();//called from cli - ionic serve - cwd is this
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
    console.log('Defaulting address to 0.0.0.0');
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
    if(options.runLivereload) {
      return Serve.checkPorts(false, options.liveReloadPort, options.address, options);
    }
  })
  .then(function() {
    ConfigXml.setConfigXml( process.cwd(), {
      devServer: Serve.host(options.address, options.port)
    }).then(function(){
      d.resolve();
    });
    if (argv.v2) {
      options.config = project.get();
    }
    return Serve.start(options);
  })
  .then(function() {
    Serve.showFinishedServeMessage(options);
    return options;
  })
  .catch(function(error) {
    console.log('There was an error serving your Ionic application for run', error);
    console.log(error.stack);
    throw error;
  });
};

IonicTask.prototype.checkIfPlatformInstalled = function checkIfPlatformInstalled(platform) {
  platform = platform || 'ios';

  var platformPath = path.join(process.cwd(), 'platforms', platform);
  var platformStats;
  try {
    platformStats = fs.statSync(platformPath);
    return true;
  } catch (ex) {
    return false;
  }
};

IonicTask.prototype.checkForPlugins = function checkForPlugins() {
  var pluginPath = path.join(process.cwd(), 'plugins');
  var platformStats;
  try {
    platformStats = fs.statSync(pluginPath);
    return true;
  } catch (ex) {
    return false;
  }
};

exports.IonicTask = IonicTask;
