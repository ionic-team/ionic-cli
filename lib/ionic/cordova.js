var Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    Q = require('q'),
    argv = require('optimist').boolean(['no-hook', 'n', 'r', 'no-resources']).argv,
    path = require('path'),
    exec = require('child_process').exec,
    colors = require('colors'),
    shelljs = require('shelljs'),
    generate = require('./resources/generate'),
    settings = require('./resources/settings');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  this.ionic = ionic;
  var self = this;
  var cmdName = process.argv[2].toLowerCase();
  var q;

  this.isLiveReload = ((cmdName == 'run' || cmdName == 'emulate') && (argv.livereload || argv['live-reload'] || argv.l));

  this.addIcons = !(argv['no-resources'] || argv.r);

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

  if(argv._.indexOf('platform') != -1 && argv._.indexOf('add') != -1 ) {
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
    self.runCordova(cmdName);
  })
};


IonicTask.prototype.runCordova = function(cmdName) {
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

  var noHook = cmdArgs.some(function(cmdArg) {
    return cmdArg === '--no-hook' || cmdArg === '-n';
  });

  if (!noHook) {
    console.log('Adding in default Ionic hooks'.yellow.bold)
    this.addHooks();
    this.removeOldPluginHooks();
  } else {
    console.log('Option passed to not install default Ionic hooks'.yellow.bold)
  }

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

  cordovaProcess.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  cordovaProcess.stderr.on('data', function (data) {
    if(data) {
      process.stderr.write(data.toString().error.bold);
    }
  });

  if(self.isLiveReload) {
    cordovaProcess.on('exit', function(){
      setTimeout(function(){
        // set it back to the original src after a few seconds
        self.ionic.setConfigXml({
          resetContent: true,
          errorWhenNotFound: true
        });
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

IonicTask.prototype.removeOldPluginHooks = function removeOldPluginHooks() {
  var oldPluginHooks = [
    'after_platform_add/010_install_plugins.js',
    'after_plugin_add/010_register_plugin.js',
    'after_plugin_rm/010_deregister_plugin.js'
  ];

  oldPluginHooks.forEach(function(hook) {
    try {
      var hookPath = path.join('.', 'hooks', hook);
      fs.unlinkSync(hookPath);
    } catch(ex) { }
  })
}

IonicTask.prototype.addHooks = function() {
  // Add hooks which this Ionic project doesn't already have
  // note: hook scripts must be executable!

  if( !fs.existsSync(path.join('www')) ) {
    // don't both doing any of this if they aren't
    // in the correct working directory, which would have `www`
    return;
  }

  // loop through all the hook directories added to the ionic-cli
  var cliHooksPath = path.join(__filename, '../../hooks');
  fs.readdir(cliHooksPath, function(err, files){
    if(err) return;
    for(var x=0; x<files.length; x++) {
      if(files[x].indexOf('.') > -1) continue;
      addCliHookDirectory( path.join(cliHooksPath, files[x]), files[x] );
    }
  });

  function addCliHookDirectory(cliHookPath, hookDirectoryName) {
    fs.readdir(cliHookPath, function(err, files){
      // loop through each of the scripts in the ionic-cli hook directory
      if(err) return;
      for(var x=0; x<files.length; x++) {
        var hookFilename = files[x];
        if(hookFilename.indexOf('.js') === -1) return;

        // check if this hook script has already been added to this ionic project
        var projectHookPath = path.join('hooks', hookDirectoryName, hookFilename);
        addHookScript(cliHookPath, hookDirectoryName, hookFilename);
      }
    });
  }

  function addHookScript(cliHookPath, hookDirectoryName, hookFilename) {
    // add the root hooks directory if the project doesn't have it
    try {
      var projectHookPath = path.join('hooks');
      if( !fs.existsSync(projectHookPath) ) {
        fs.mkdirSync(projectHookPath);
      }

      // add the hook directory (ie: after_prepare) if the project doesn't have it
      projectHookPath = path.join(projectHookPath, hookDirectoryName);
      if( !fs.existsSync(projectHookPath) ) {
        fs.mkdirSync(projectHookPath);
      }

      var projectScript = path.join(projectHookPath, hookFilename);
      if( !fs.existsSync(projectScript) ) {
        // copy the hook script to the project
        try {
          var cliScript = path.join(cliHookPath, hookFilename);
          fs.writeFileSync(projectScript, fs.readFileSync(cliScript));
        } catch(e) {
          console.log( ('addCliHookDirectory fs.createReadStream: ' + e).error );
          return;
        }
      }

      // make the script file executable
      try {
        fs.chmodSync(projectScript, '755');
      } catch(e) {
        console.log( ('addCliHookDirectory fs.chmodSync: ' + e).error );
      }

    } catch(e) {
      console.log('Error adding hook script ' + hookDirectoryName + '/' + hookFilename + ', ' + e);
    }
  }

};

exports.IonicTask = IonicTask;
