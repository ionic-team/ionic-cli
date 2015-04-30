var Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    Q = require('q'),
    argv = require('optimist').boolean(['nohooks', 'n', 'r', 'noresources', 'nosave', 'e']).argv,
    path = require('path'),
    exec = require('child_process').exec,
    colors = require('colors'),
    shelljs = require('shelljs'),
    generate = require('./resources/generate'),
    settings = require('./resources/settings'),
    Hooks = require('./hooks'),
    State = require('./state');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  this.ionic = ionic;
  var self = this;
  var cmdName = process.argv[2].toLowerCase();
  var q;

  this.isLiveReload = ((cmdName == 'run' || cmdName == 'emulate') && (argv.livereload || argv['live-reload'] || argv.l));

  this.addIcons = !(argv.noresources || argv.r);

  if(this.isLiveReload) {
    q = self.setupLiveReload();

  } else {
    // ensure the content node was set back to its original
    q = self.ionic.setConfigXml({
      resetContent: true,
      errorWhenNotFound: false
    });
  }

  var addDefaultResources = false;
  var isPlatformCmd = argv._.indexOf('platform') != -1;
  var isAddCmd = argv._.indexOf('add') != -1;
  var isPluginCmd = argv._.indexOf('plugin') != -1;
  var isRmCmd = argv._.indexOf('rm') != -1 || argv._.indexOf('remove') != -1;
  
  Hooks.setHooksPermission();

  if(isPlatformCmd && isAddCmd) {
    addDefaultResources = true;
  }
  // console.log('Icons: ', addDefaultResources, 'Add icons:', this.addIcons)

  q.then(function(){
    if(addDefaultResources && self.addIcons) {
      return generate.copyIconFilesIntoResources()
      .then(function() {
        return generate.addIonicIcons(argv._[2]);
      })
    } else {
      return false;
    }
  })
  .then(function() {
    return self.runCordova(cmdName);
  })
  .then(function(runCode) {
    //We dont want to do anything if the cordova command failed
    if(runCode !== 0 || argv.nosave) {
      return
    }
    if (isPlatformCmd && isAddCmd) {
      addDefaultResources = true;
      console.log('Saving platform to package.json file'.blue)
      return State.savePlatform(argv);
    } else if (isPlatformCmd && isRmCmd) {
      console.log('Removing platform from package.json file'.blue)
      return State.removePlatform(argv);
    } else if (isPluginCmd && isAddCmd) {
      console.log('Saving plugin to package.json file'.blue)
      return State.savePlugin(argv);
    } else if (isPluginCmd && isRmCmd) {
      console.log('Removing plugin from package.json file'.blue)
      return State.removePlugin(argv);
    }
  })
}

IonicTask.prototype.runCordova = function(cmdName) {
  var deferred = Q.defer();
  var self = this;
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);
  var cmdArg, x, y;

  // backwards compatibility prior to fully wrapping cordova cmds
  if(cmdName == 'platform') {
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

  // var noHook = argv.nohooks || argv.n;

  // if (!noHook) {
  //   console.log('Adding in default Ionic hooks'.yellow.bold)
  //   // this.addHooks();
  //   // this.removeOldPluginHooks();
  // } else {
  //   console.log('Option passed to not install default Ionic hooks'.yellow.bold)
  // }

  cmdArgs.unshift(cmdName);

  // clean out any cmds that may confuse cordova
  var cleanArgs = [];
  var port = argv.port || argv.p || '';
  var liveReloadPort = argv.livereloadport || argv['livereload-port'] || argv.r || '';
  var ignoreCmds = '--livereload -l --consolelogs -c --serverlogs -s --port -p --livereload-port -i -r'.split(' ');
  var isValdCmd;
  for(x=0; x<cmdArgs.length; x++) {
    cmdArg = cmdArgs[x];
    if(port && cmdArg == port) continue;
    if(liveReloadPort && cmdArg == liveReloadPort) continue;
    isValdCmd = true;
    for(y=0; y<ignoreCmds.length; y++) {
      if(cmdArg == ignoreCmds[y]) {
        isValdCmd = false;
        break;
      }
    }
    if(isValdCmd) {
      // make sure --target= has double quotes around it (process.argv removes them)
      if(cmdArg.indexOf('--target=') === 0 && cmdArg.indexOf('"') === -1) {
        cmdArg = cmdArg.replace('--target=', '--target="') + '"';
      }

      cleanArgs.push(cmdArg);
    }
  }

  var cordovaProcess = exec('cordova ' + cleanArgs.join(' '));
  console.log('running cordova ' + cleanArgs.join(' '))

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
      console.log('cordova process is exiting');
      setTimeout(function(){
        // set it back to the original src after a few seconds
        self.ionic.setConfigXml({
          resetContent: true,
          errorWhenNotFound: true
        });
        // deferred.resolve();
      }, 5000);
    });

    process.on('exit', function(){
      // verify it was set back
      self.ionic.setConfigXml({
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


IonicTask.prototype.setupLiveReload = function() {
  var d = Q.defer();

  console.log('Setup Live Reload'.green.bold);

  var self = this;
  var serve = new require('./serve');
  var serveTask = new serve.IonicTask();
  serveTask.ionic = this.ionic;
  serveTask.isPlatformServe = true;

  serveTask.loadSettings();

  serveTask.getAddress()
  .then(function() {
    return serveTask.checkPorts(true, serveTask.port, serveTask.address);
  })
  .then(function() {
    if(serveTask.runLivereload) {
      return serveTask.checkPorts(false, serveTask.liveReloadPort, serveTask.address);
    }
  })
  .then(function() {

    serveTask.runLivereload = true;
    serveTask.launchBrowser = false;
    serveTask.launchLab = false;
    serveTask.start(self.ionic);

    if(self.ionic.hasFailed) return;

    self.ionic.setConfigXml({
      devServer: serveTask.devServer
    }).then(function(){
      d.resolve();
    });
  })
  .catch(function(error) {

  })

  return d.promise;
};

exports.IonicTask = IonicTask;
