var fs = require('fs'),
    argv = require('optimist').argv,
    connect = require('connect'),
    open = require('open'),
    Q = require('q'),
    IonicProject = require('./project'),
    IonicTask = require('./task').IonicTask;
    IonicStats = require('./stats').IonicStats;

var IonicServeTask = function() {}

IonicServeTask.HELP_LINE = 'Start a local development server for easy app development and testing';

IonicServeTask.prototype = new IonicTask();

IonicServeTask.prototype._printUsage = function() {
  process.stderr.write('\nUsage: ionic serve [port] [options]\n');
  process.stderr.write('\nUse --nobrowser to disable auto browser launch\n');
};

IonicServeTask.prototype.run = function(ionic) {
  var project = IonicProject.load();

  // Grab the name of the app
  this.port = argv._[1] || '8100';

  this.launchBrowser = typeof argv['nobrowser'] === 'undefined';

  this._start();
};

IonicServeTask.prototype._start = function() {
  var self = this;

  console.log('Running local development server at', ('http://0.0.0.0:' + this.port).info.bold);

  setTimeout(function() {
    if(self.launchBrowser) {
      open('http://localhost:' + self.port);
    }
  });
  connect().use(connect.static('www')).listen(this.port);
};

module.exports = IonicServeTask;
