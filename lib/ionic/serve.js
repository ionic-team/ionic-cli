var IonicAppLib = require('ionic-app-lib');
var Utils = IonicAppLib.utils;
var events = IonicAppLib.events;
var Q = require('q');
var Task = require('./task').Task;
var Serve = IonicAppLib.serve;
var log = IonicAppLib.logging.logger;
var IonicProject = IonicAppLib.project;

function IonicTask() {}

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  this.ionic = ionic;
  this.port = argv._[1];
  this.liveReloadPort = argv._[2];

  if (argv._[0] === 'address') {

    // reset any address configs
    var ionicConfig = IonicAppLib.config.load();
    ionicConfig.set('ionicServeAddress', null);
    ionicConfig.set('platformServeAddress', null);
    return Serve.getAddress({ isAddressCmd: true });
  }

  var project = null;
  var cwd = process.cwd();

  try {
    project = IonicProject.load(cwd);
  } catch (ex) {
    log.error('Error occured', ex);
    return Utils.fail(ex.message);
  }

  var options = Serve.loadSettings(argv, project);

  options.appDirectory = cwd; // called from cli - ionic serve - cwd is this

  options.nogulp = argv.nogulp;

  // check if CONNECT_LIVE_RELOAD_PORT is defined and use that instead
  if (process.env.CONNECT_LIVE_RELOAD_PORT) {
    options.liveReloadPort = process.env.CONNECT_LIVE_RELOAD_PORT;
  }

  var promise;

  try {
    if (argv.all || argv.a) {
      options.address = '0.0.0.0';
      promise = Q();
    } else if (argv.address) {
      options.address = argv.address;
      promise = Q();
    } else {
      promise = Serve.getAddress(options);
    }

    return promise
    .then(function() {
      return Serve.checkPorts(true, options.port, options.address, options);
    })
    .then(function() {
      if (options.runLivereload) {
        return Serve.checkPorts(false, options.liveReloadPort, options.address, options);
      }
    })
    .then(function() {
      return Serve.start(options);
    })
    .then(function() {
      return Serve.showFinishedServeMessage(options);
    })
    .then(function() {
      events.on('serverlog', log.info);
      events.on('consolelog', log.info);
    })
    .catch(function(error) {
      log.info('There was an error serving your Ionic application:', error);
      throw error;
    });
  } catch (ex) {
    Utils.fail('Error with serve- ' + ex);
  }
};

exports.IonicTask = IonicTask;
