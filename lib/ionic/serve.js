var IonicAppLib = require('ionic-app-lib'),
    IonicStats = require('./stats').IonicStats,
    IonicProject = require('./project'),
    events = IonicAppLib.events,
    Q = require('q'),
    Serve = IonicAppLib.serve,
    Task = require('./task').Task,
    Utils = require('./utils');

var DEFAULT_HTTP_PORT = 8100;
var DEFAULT_LIVE_RELOAD_PORT = 35729;
var IONIC_LAB_URL = '/ionic-lab';

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  var self = this;
  this.ionic = ionic;
  this.port = argv._[1];
  this.liveReloadPort = argv._[2];

  if (argv._[0] == 'address') {
      // reset any address configs
      var ionicConfig = require('./config').load();
      ionicConfig.set('ionicServeAddress', null);
      ionicConfig.set('platformServeAddress', null);
      return Serve.getAddress({isAddressCmd: true});
  }

  var project = null;

  try {
    project = IonicProject.load(process.cwd());
  } catch (ex) {
    console.log('Error occured', ex);
    return Utils.fail(ex.message);
  }

  var options = Serve.loadSettings(argv, project);
  options.appDirectory = process.cwd();//called from cli - ionic serve - cwd is this

  options.nogulp = argv.nogulp;

  IonicStats.t();
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
      // console.log('options.address', options.address);
      return Serve.checkPorts(true, options.port, options.address, options);
    })
    .then(function() {
      if(options.runLivereload) {
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
      // return Serve.listenToServeLogs(options);
      events.on('serverlog', console.log);
      events.on('consolelog', console.log);
    })
    .catch(function(error) {
      console.log('There was an error serving your Ionic application:', error);
      throw error;
    });
  } catch (ex) {
    Utils.fail('Error with serve- ' + ex);
    console.log(ex.stack);
  }
};

exports.IonicTask = IonicTask;
