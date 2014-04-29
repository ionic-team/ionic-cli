var fs = require('fs'),
    argv = require('optimist').argv,
    connect = require('connect'),
    open = require('open'),
    tinylr = require('tiny-lr-fork'),
    lr = require('connect-livereload'),
    vfs = require('vinyl-fs'),
    request = require('request'),
    Q = require('q'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask;
    IonicStats = require('./stats').IonicStats;

var IonicServeTask = function() {}

IonicServeTask.HELP_LINE = 'Start a local development server for easy app development and testing';

IonicServeTask.prototype = new IonicTask();

IonicServeTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic serve [http-port] [livereload-port] [options]\n');
  process.stderr.write('\nUse --nobrowser to disable auto browser launch\n');
};

IonicServeTask.prototype.run = function(ionic) {
  var project = IonicProject.load();

  // Grab the name of the app
  this.port = argv._[1] || 8100;
  this.liveReloadPort = argv._[2] || 35729;

  this.launchBrowser = typeof argv['nobrowser'] === 'undefined';
  this.runLivereload = typeof argv['nolivereload'] === 'undefined';

  this._start(ionic);
};

IonicServeTask.prototype._changed = function(path) {
  // Cleanup the path a bit
  var pwd = process.cwd()
  path = path.replace(pwd + '/', '');

  console.log('Changed', path);

  var req = request.post('http://localhost:' + this.liveReloadPort + '/changed', {
    path: '/changed',
    method: 'POST',
    body: JSON.stringify({
      files: [path]
    })
  }, function(err, res, body) {
    if(err) {
      console.error('Unable to update live reload:', err);
    }
  });
};

IonicServeTask.prototype._start = function(ionic) {
  var self = this;

  var app = connect();

  if(this.runLivereload) {
    vfs.watch('www/**/*', {
    }, function(f) {
      self._changed(f.path);
    });

    server = tinylr();
    server.listen(this.liveReloadPort, function(err) {
      if(err) {
        ionic.fail('Unable to start server:', err);
      } else {
        console.log('Running live reload server at', ('http://0.0.0.0:' + self.liveReloadPort).info.bold);
        if(self.launchBrowser) {
          open('http://localhost:' + self.port);
        }
      }
    });

    app.use(require('connect-livereload')({
      port: this.liveReloadPort
    }))
  }

  app.use(connect.static('www'))
    .listen(this.port);
  
  console.log('Running dev server at', ('http://0.0.0.0:' + this.port).info.bold);
};

module.exports = IonicServeTask;
