var IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    colors = require('colors');

var IonicCordovaTask = function() {};

IonicCordovaTask.prototype = new IonicTask();

IonicCordovaTask.prototype.run = function(ionic) {
  var cmdName = process.argv[2].toLowerCase();
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);

  // backwards compatibility prior to fully wrapping cordova cmds
  if(cmdName == 'platform') {
    // `ionic platform <PLATFORM>` used to actually run `ionic platform add <PLATFORM>`
    // if a cordova platform cmd isn't the cmd then automatically insert `add`
    var hasCordovaCmd = false;
    var validCommands = 'add remove rm list ls update up check'.split(' ');
    var cmdArg, x, y;
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
  this.addHooks();

  cmdArgs.unshift(cmdName);

  var cordovaCmd = spawn(process.platform === "win32" ? "cordova.cmd" : "cordova", cmdArgs);

  cordovaCmd.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  cordovaCmd.stderr.on('data', function (data) {
    if(data) {
      process.stderr.write(data.toString().error.bold);
    }
  });

  IonicStats.t();
};


IonicCordovaTask.prototype.addHooks = function() {
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
      addcliHookDirectory( path.join(cliHooksPath, files[x]), files[x] );
    }
  });

  function addcliHookDirectory(cliHookPath, hookDirectoryName) {
    fs.readdir(cliHookPath, function(err, files){
      // loop through each of the scripts in the ionic-cli hook directory
      if(err) return;
      for(var x=0; x<files.length; x++) {
        var hookFilename = files[x];
        if(hookFilename.indexOf('.js') === -1) return;

        // check if this hook script has already been added to this ionic project
        var projectHookPath = path.join('hooks', hookDirectoryName, hookFilename);
        if( !fs.existsSync(projectHookPath) ) {
          addHookScript(cliHookPath, hookDirectoryName, hookFilename);
        }
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

      // copy the hook script to the project
      var cliScript = path.join(cliHookPath, hookFilename);
      var projectScript = path.join(projectHookPath, hookFilename);
      fs.createReadStream( cliScript ).pipe(fs.createWriteStream( projectScript ));

      // make the script file executable
      fs.chmodSync(projectScript, '755');

    } catch(e) {
      console.log('Error adding hook script ' + hookDirectoryName + '/' + hookFilename + ', ' + e);
    }
  }

};

exports.IonicCordovaTask = IonicCordovaTask;
