var fs = require('fs'),
    path = require('path'),
    argv = require('optimist').argv,
    Q = require('q'),
    shelljs = require('shelljs'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    _ = require('underscore'),
    IonicProject = require('./project'),
    IonicInfo = require('./info').IonicTask;


var Hooks = module.exports

shelljs.config.silent = true;

var IonicTask = function() {};

IonicTask.prototype = new Task();

Hooks.addCliHookDirectory = function addCliHookDirectory(cliHookPath, hookDirectoryName) {
  fs.readdir(cliHookPath, function(err, files){
    // loop through each of the scripts in the ionic-cli hook directory
    if(err) return;
    for(var x=0; x<files.length; x++) {
      var hookFilename = files[x];
      if(hookFilename.indexOf('.js') === -1) return;

      // check if this hook script has already been added to this ionic project
      var projectHookPath = path.join('hooks', hookDirectoryName, hookFilename);
      Hooks.addHookScript(cliHookPath, hookDirectoryName, hookFilename);
    }
  });
}

Hooks.addHookScript = function addHookScript(cliHookPath, hookDirectoryName, hookFilename) {
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

Hooks.add = function add() {
  console.log('Adding in default Ionic Cordova hooks'.blue.bold);
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
      Hooks.addCliHookDirectory( path.join(cliHooksPath, files[x]), files[x] );
    }
  });

  console.log('Added default Ionic Cordova hooks'.green.bold)

};

Hooks.remove = function remove() {
  console.log('Removing the Ionic Cordova plugin hooks'.blue.bold)
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

  console.log('Removed the Ionic Cordova hooks'.green.bold);

};

Hooks.setHooksPermission = function setHooksPermission() {
  //Go through `hooks` directory - after_prepare
  //for each directory, go into the directories of that path
  //For each path, set permission on file
  try {
    var hooksPath = path.resolve('hooks');

    var hooksDirs = fs.readdirSync(hooksPath),
        hookDirPath,
        hookStats,
        hooksInDir;

    hooksDirs.forEach(function(hookDir) {
      hookStats = fs.statSync(path.join(hooksPath, hookDir));
      if(!hookStats.isDirectory()) return;
      hookDirPath = path.join(hooksPath, hookDir); //after_prepare
      hooksInDir = fs.readdirSync(hookDirPath);

      hooksInDir.forEach(function(hook){
        // make the script file executable
        try {
          fs.chmodSync(path.resolve(hooksPath, hookDir, hook), '755');
        } catch(e) {
          console.log(('Hooks.setHooksPermission fs.chmodSync: ' + e).error)
        }
      })
    });
  } catch (ex) {
    console.log('log', 'Error', ex);
  }

  console.log('Updated the hooks directory to have execute permissions'.green);
};

IonicTask.prototype.run = function run(ionic) {
  var self = this;
  this.ionic = ionic;

  var cmd = argv._[1];

  switch(cmd) {
    case 'add':
      Hooks.add();
      break;
    case 'remove':
      Hooks.remove(argv);
      break;
    default:
      console.log('Please supply a command - either add or remove'.red.bold);
  }

  IonicStats.t();

};

exports.IonicTask = IonicTask;
