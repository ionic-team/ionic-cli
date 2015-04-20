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
  options.appDirectory = process.cwd();//called from cli - ionic serve - cwd is this
  //TODO: Look up address stuffs

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
