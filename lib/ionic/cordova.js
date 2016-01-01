var Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    Q = require('q'),
    // argv = require('optimist').boolean(['nohooks', 'n', 'r', 'noresources', 'nosave', 'e']).argv,
    path = require('path'),
    exec = require('child_process').exec,
    colors = require('colors'),
    shelljs = require('shelljs'),
    IonicAppLib = require('ionic-app-lib'),
    IonicProject = require('./project'),
    IonicResources = IonicAppLib.resources,
    ConfigXml = IonicAppLib.configXml,
    Cordova = IonicAppLib.cordova,
    Hooks = IonicAppLib.hooks,
    Serve = IonicAppLib.serve,
    State = IonicAppLib.state,
    Utils = IonicAppLib.utils;

var IonicTask = function() {};
IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  this.ionic = ionic;
  var self = this;
  var appDirectory = process.cwd();
  var cmdName = process.argv[2].toLowerCase();
  var q;

  try {
    this.isLiveReload = ((cmdName == 'run' || cmdName == 'emulate') && (argv.livereload || argv['live-reload'] || argv.l));
    this.addIcons = !(argv.noresources || argv.r);

    if(this.isLiveReload) {
      q = self.setupLiveReload(argv);
    } else {
      // ensure the content node was set back to its original
      q = self.ionic.setConfigXml({
        resetContent: true,
        errorWhenNotFound: false
      });
    }

    var addDefaultResources = false;
    var isPlatformCmd = argv._.indexOf('platform') != -1 || argv._.indexOf('platforms') != -1;
    var isAddCmd = argv._.indexOf('add') != -1;
    var isPluginCmd = argv._.indexOf('plugin') != -1 || argv._.indexOf('plugins') != -1;
    var isRmCmd = argv._.indexOf('rm') != -1 || argv._.indexOf('remove') != -1;

    if (isPlatformCmd || isAddCmd) {
      Hooks.setHooksPermission(process.cwd());
    }

    if(isPlatformCmd && isAddCmd) {
      addDefaultResources = true;
    }

    return q.then(function(serveOptions){
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

  var cordovaProcess = exec('cordova ' + cleanArgs.join(' '));
// console.log('running cordova ' + cleanArgs.join(' '));

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

  IonicStats.t();

  return deferred.promise;
};


IonicTask.prototype.setupLiveReload = function(argv) {
  var d = Q.defer();

  console.log('Setup Live Reload'.green.bold);

  var project = null;

  try {
    project = IonicProject.load(process.cwd());
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

exports.IonicTask = IonicTask;
