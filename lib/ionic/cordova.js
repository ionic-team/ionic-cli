var IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats,
    fs = require('fs'),
    argv = require('optimist').argv,
    xml2js = require('xml2js'),
    path = require('path'),
    exec = require('child_process').exec,
    colors = require('colors');

var IonicCordovaTask = function() {};

IonicCordovaTask.prototype = new IonicTask();

IonicCordovaTask.prototype.run = function(ionic) {
  var self = this;
  self.ionic = ionic;
  var cmdName = process.argv[2].toLowerCase();
  var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []);

  self.isLiveReload = (cmdName == 'run' && (argv.livereload || argv['live-reload'] || argv.l));

  if(self.isLiveReload) {
    self.setupLiveReload();
  }

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

  var cordovaProcess = exec('cordova ' + cmdArgs.join(' '));

  cordovaProcess.stdout.on('data', function (data) {
    process.stdout.write(data);
  });

  cordovaProcess.stderr.on('data', function (data) {
    if(data) {
      process.stderr.write(data.toString().error.bold);
    }
  });

  cordovaProcess.on('exit', function(){
    if(self.isLiveReload) {
      self.wwwSymlinks(true);
      self.setConfigXml({
        resetContent: true
      });
    }
  });

  if(self.isLiveReload) {
    if (process.platform === 'win32'){
      // emit SIGINT on windows
      var readline = require ('readline'),
          rl = readline.createInterface ({
               input: process.stdin,
               output: process.stdout
          });

      rl.on ('SIGINT', function (){
        process.emit('SIGINT');
      });
    }

    process.on('SIGINT', function(){
      // doing this so the exit event fires on Cmd + c
      process.exit();
    });
    process.on('exit', function() {
      // remove the symlinks
      self.wwwSymlinks(false);
    });
  }

  IonicStats.t();
};


IonicCordovaTask.prototype.setupLiveReload = function() {
  console.log('Setup Live Reload'.green.bold);

  var serve = new require('./serve');
  var serveTask = new serve.IonicServeTask();
  serveTask.loadSettings();
  serveTask.runLivereload = true;
  serveTask.launchBrowser = false;
  serveTask.start(this.ionic);

  this.setConfigXml({
    devServer: serveTask.devServer
  });
};


IonicCordovaTask.prototype.setConfigXml = function(options) {
  var self = this;
  var madeChange = false;

  try {
    var configXmlPath = path.resolve('config.xml');
    var configString = fs.readFileSync(configXmlPath, { encoding: 'utf8' });

    var parseString = xml2js.parseString;
    parseString(configString, function (err, jsonConfig) {
      if(err) {
        return self.ionic.fail('Error parsing config.xml: ' + err);
      }

      if(options.devServer) {
        if( !jsonConfig.widget.content[0].$['original-src'] ) {
          jsonConfig.widget.content[0].$['original-src'] = jsonConfig.widget.content[0].$.src;
          madeChange = true;
        }
        if(jsonConfig.widget.content[0].$.src !== options.devServer) {
          jsonConfig.widget.content[0].$.src = options.devServer;
          madeChange = true;
        }

      } else if(options.resetContent) {
        if( jsonConfig.widget.content[0].$['original-src'] ) {
          jsonConfig.widget.content[0].$.src = jsonConfig.widget.content[0].$['original-src'];
          delete jsonConfig.widget.content[0].$['original-src'];
          madeChange = true;
        }
      }

      if(madeChange) {
        var xmlBuilder = new xml2js.Builder();
        configString = xmlBuilder.buildObject(jsonConfig);

        fs.writeFileSync(configXmlPath, configString);
      }

    });

  } catch(e) {
    return self.ionic.fail('Error updating config.xml file: ' + e);
  }
};


IonicCordovaTask.prototype.wwwSymlinks = function(createSymlinks) {
  var platformCordovaJs, platformPluginJs, platformPluginsDir;

  var wwwCordovaJs = path.resolve( path.join('www', 'cordova.js') );
  var wwwPluginJs = path.resolve( path.join('www', 'cordova_plugins.js') );
  var wwwPluginsDir = path.resolve( path.join('www', 'plugins') );

  if(createSymlinks) {

    var platform;
    var platforms = 'android ios'.split(' ');
    for(var x=0; x<platforms.length; x++) {
      for(var y=0; y<process.argv.length; y++) {
        if(platforms[x] == process.argv[y].toLowerCase()) {
          platform = process.argv[y].toLowerCase();
        }
      }
    }

    if(platform == 'ios') {
      console.log('Create symlinks to iOS platform build directory');
      platformCordovaJs = path.resolve( path.join('platforms', 'ios', 'www', 'cordova.js') );
      platformPluginJs = path.resolve( path.join('platforms', 'ios', 'www', 'cordova_plugins.js') );
      platformPluginsDir = path.resolve( path.join('platforms', 'ios', 'www', 'plugins') );

    } else if(platform == 'android') {
      console.log('Create symlinks to Android platform build directory');
      platformCordovaJs = path.resolve( path.join('platforms', 'android', 'assets', 'www', 'cordova.js') );
      platformPluginJs = path.resolve( path.join('platforms', 'android', 'assets', 'www', 'cordova_plugins.js') );
      platformPluginsDir = path.resolve( path.join('platforms', 'android', 'assets', 'www', 'plugins') );
    }

    if( fs.existsSync(platformCordovaJs) && !fs.existsSync(wwwCordovaJs) ) {
      console.log('Create symlink: www/cordova.js');
      fs.symlinkSync(platformCordovaJs, wwwCordovaJs);
    }

    if( fs.existsSync(platformPluginJs) && !fs.existsSync(wwwPluginJs) ) {
      console.log('Create symlink: www/cordova_plugins.js');
      fs.symlinkSync(platformPluginJs, wwwPluginJs);
    }

    if( fs.existsSync(platformPluginsDir) && !fs.existsSync(wwwPluginsDir) ) {
      console.log('Create symlink: www/plugins');
      fs.symlinkSync(platformPluginsDir, wwwPluginsDir);
    }

  } else {
    // delete the symlinks
    console.log('');
    try {
      fs.unlinkSync(wwwCordovaJs);
      console.log('Removed symlink: www/cordova.js');
    }catch(e){}

    try {
      fs.unlinkSync(wwwPluginJs);
      console.log('Removed symlink: www/cordova_plugins.js');
    }catch(e){}

    try {
      fs.unlinkSync(wwwPluginsDir);
      console.log('Removed symlink: www/plugins');
    }catch(e){}
  }

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
