var fs = require('fs'),
    Q = require('q'),
    path = require('path'),
    argv = require('optimist').argv,
    connect = require('connect'),
    finalhandler = require('finalhandler'),
    http = require('http'),
    serveStatic = require('serve-static'),
    tinylr = require('tiny-lr-fork'),
    lr = require('connect-livereload'),
    vfs = require('vinyl-fs'),
    request = require('request'),
    IonicProject = require('./project'),
    Task = require('./task').Task,
    proxyMiddleware = require('proxy-middleware'),
    url = require('url'),
    xml2js = require('xml2js'),
    IonicStats = require('./stats').IonicStats,
    ionicCliLib = require('ionic-app-lib'),
    Serve = ionicCliLib.serve,
    shelljs = require('shelljs'),
    events = ionicCliLib.events,
    ports = require('./ports');

var DEFAULT_HTTP_PORT = 8100;
var DEFAULT_LIVE_RELOAD_PORT = 35729;
var IONIC_LAB_URL = '/ionic-lab';

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  var self = this;
  this.ionic = ionic;
  this.port = argv._[1];
  this.liveReloadPort = argv._[2];

  var options = Serve.loadSettings(argv);
  options.address = '0.0.0.0';
  options.appDirectory = process.cwd();//called from cli - ionic serve - cwd is this
  //TODO: Look up address stuffs

  return Serve.start(options)
  .then(function() {
    return Serve.showFinishedServeMessage(options);
  })
  .then(function() {
    // return Serve.listenToServeLogs(options);
    events.on('serverlog', console.log);
    events.on('consolelog', console.log);
  })
  .catch(function(error) {
    console.log('There was an error serving your Ionic application:', error);
    throw error;
  })
  // return;
  // this.loadSettings();

  // this.getAddress()
  // .then(function() {
  //   return self.checkPorts(true, self.port, self.address);
  // })
  // .then(function() {
  //   if(self.runLivereload) {
  //     return self.checkPorts(false, self.liveReloadPort, self.address);
  //   }
  // })
  // .then(function() {
  //   if(self.isAddressCmd) {
  //     console.log( self.address );
  //     process.exit();
  //   }

  //   self.start(ionic)

  //   // self.printCommandTips();
  //   // console.log('listenForServerCommands')
  //   // self.listenForServerCommands();

  //   if(ionic.hasFailed) return;

  //   ionic.latestVersion.promise.then(function(){
  //     ionic.printVersionWarning();
  //   });
  // })
  // .catch(function(error) {

  // })

};

//isIonicServer = true when serving www directory, false when live reload
IonicTask.prototype.checkPorts = function(isIonicServer, testPort, testHost) {
  var q = Q.defer();

  var self = this,
      message = [];

  if(isIonicServer) {
    testHost = this.address == 'localhost' ? null : this.address;
  } else {
    testHost = null;
  }

  ports.getPort({port: testPort, host: testHost},
    function(err, port) {
    if(port != testPort) {
      message = ['The port ', testPort, ' was taken on the host ', self.address, ' - using port ', port, ' instead'].join('');
      console.log(message.yellow.bold);
      if(isIonicServer) {
        self.port = port;
      } else {
        self.liveReloadPort = port;
      }
    }
    q.resolve();
  });

  return q.promise;
}


IonicTask.prototype.loadSettings = function(cb) {
  var project = null;

  try {
    project = IonicProject.load();
  } catch (ex) {
    this.ionic.fail(ex.message);
    return
  }
  var self = this;

  this.port = this.port || argv.port || argv.p || DEFAULT_HTTP_PORT;
  this.liveReloadPort = this.liveReloadPort || argv.livereloadport || argv.r || argv['livereload-port'] || argv.i || DEFAULT_LIVE_RELOAD_PORT;
  this.launchBrowser = !argv.nobrowser && !argv.b;
  this.launchLab = this.launchBrowser && (argv.lab || argv.l);
  this.runLivereload = !(argv.nolivereload || argv.d);
  this.useProxy = !argv.noproxy && !argv.x;
  this.proxies = project.get('proxies') || [];
  this.watchSass = project.get('sass') === true && !argv.nosass && !argv.n;
  this.gulpStartupTasks = project.get('gulpStartupTasks');
  
  this.browser = argv.browser || argv.w || '';
  this.browserOption = argv.browserOption || argv.o || '';

  //Check for default browser being specified
  this.defaultBrowser = argv.defaultBrowser || argv.f || project.get('defaultBrowser');

  if(this.defaultBrowser) {
    project.set('defaultBrowser', this.defaultBrowser);
    project.save();
  }

  this.browser = this.browser || this.defaultBrowser;

  this.watchPatterns = project.get('watchPatterns') || ['www/**/*', '!www/lib/**/*'];
  this.printConsoleLogs = argv.consolelogs || argv['console-logs'] || argv.c;
  this.printServerLogs = argv.serverlogs || argv['server-logs'] || argv.s;
  this.isAddressCmd = argv._[0].toLowerCase() == 'address';
  this.documentRoot = project.get('documentRoot') || 'www';
  this.createDocumentRoot = project.get('createDocumentRoot') || null;
  this.contentSrc = path.join(this.documentRoot, this.ionic.getContentSrc());

};

IonicTask.prototype.getAddress = function(cb) {
  var q = Q.defer();
  try {
    var self = this;
    var addresses = [];
    var os = require('os');
    var ifaces = os.networkInterfaces();
    var ionicConfig = require('./config').load();

    var addressConfigKey = (self.isPlatformServe ? 'platformServeAddress' : 'ionicServeAddress');
    var tryAddress;

    if(self.isAddressCmd) {
      // reset any address configs
      ionicConfig.set('ionicServeAddress', null);
      ionicConfig.set('platformServeAddress', null);
    } else {
      if(!argv.address)
        tryAddress = ionicConfig.get(addressConfigKey);
      else
        tryAddress = argv.address;
    }

    if(ifaces){
      for (var dev in ifaces) {
        if(!dev) continue;
        ifaces[dev].forEach(function(details){
          if (details && details.family == 'IPv4' && !details.internal && details.address) {
            addresses.push({
              address: details.address,
              dev: dev
            });
          }
        });
      }
    }

    if(tryAddress) {
      if(tryAddress == 'localhost') {
        self.address = tryAddress;
        // cb();
        q.resolve();
        return q.promise;
      }
      for(var x=0; x<addresses.length; x++) {
        // double check if this address is still available
        if(addresses[x].address == tryAddress)
        {
          self.address = addresses[x].address;
          // cb();
          q.resolve();
          return q.promise;
        }
      }
      if (argv.address) {
        self.ionic.fail('Address ' + argv.address + ' not available.');
        return q.promise;
      }
    }

    if(addresses.length > 0) {
      
      if(!self.isPlatformServe) {
        addresses.push({
          address: 'localhost'
        });
      }

      if(addresses.length === 1) {
        self.address = addresses[0].address;
        // cb();
        q.resolve();
        return q.promise;
      } 

      console.log('\nMultiple addresses available.'.error.bold);
      console.log('Please select which address to use by entering its number from the list below:'.error.bold);
      if(self.isPlatformServe) {
        console.log('Note that the emulator/device must be able to access the given IP address'.small);
      }

      for(var x=0; x<addresses.length; x++) {
        console.log( (' ' + (x+1) + ') ' + addresses[x].address + ( addresses[x].dev ? ' (' + addresses[x].dev + ')' : '' )).yellow );
      }

      console.log('Std in before prompt')
      // console.log(process.stdin)

      var prompt = require('prompt');
      var promptProperties = {
        selection: {
          name: 'selection',
          description: 'Address Selection: '.yellow.bold,
          required: true
        }
      };

      prompt.override = argv;
      prompt.message = '';
      prompt.delimiter = '';
      prompt.start();

      prompt.get({properties: promptProperties}, function (err, promptResult) {
        if(err) {
          return console.log(err);
        }

        var selection = promptResult.selection;
        for(var x=0; x<addresses.length; x++) {
          if(selection == (x + 1) || selection == addresses[x].address || selection == addresses[x].dev) {
            self.address = addresses[x].address;
            if(!self.isAddressCmd) {
              console.log('Selected address: '.green.bold + self.address);
            }
            ionicConfig.set(addressConfigKey, self.address);
            // cb();
            prompt.resume();
            q.resolve();
            return q.promise;
          }
        }

        self.ionic.fail('Invalid address selection');
      });

    } else if(self.isPlatformServe) {
      // no addresses found
      self.ionic.fail('Unable to find an IPv4 address for run/emulate live reload.\nIs WiFi disabled or LAN disconnected?');

    } else {
      // no address found, but doesn't matter if it doesn't need an ip address and localhost will do
      self.address = 'localhost';
      // cb();
      q.resolve();
    }

  } catch(e) {
    self.ionic.fail('Error getting IPv4 address: ' + e);
  }

  return q.promise;
};

exports.IonicTask = IonicTask;
