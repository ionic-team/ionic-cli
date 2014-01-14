/*
 _             _      
(_)           (_)     
 _  ___  _ __  _  ___ 
| |/ _ \| '_ \| |/ __|
| | (_) | | | | | (__ 
|_|\___/|_| |_|_|\___|

http://ionicframework.com/

A utility for starting and administering Ionic based mobile app projects.
Licensed under the MIT license. See LICENSE For more.

Copyright 2013 Drifty (http://drifty.com/)
*/
                   
var IonicStartTask = require('./ionic/start.js').IonicStartTask,
    IonicLoginTask = require('./ionic/login.js').IonicLoginTask,
    IonicUploadTask = require('./ionic/upload.js').IonicUploadTask,
    IonicBuildTask = require('./ionic/build.js').IonicBuildTask;

var fs = require('fs'), 
    argv = require('optimist').argv;

var TASKS = [
  {
    title: 'start',
    name: 'start',
    usage: 'appname',
    task: IonicStartTask
  },
  {
    title: 'login',
    name: 'login',
    usage: '[email]',
    task: IonicLoginTask
  },
  {
    title: 'upload',
    name: 'upload',
    alt: ['up'],
    usage: '',
    task: IonicUploadTask
  },
  {
    title: 'package',
    name: 'package',
    alt: ['pack'],
    usage: 'platform',
    task: IonicPackageTask
  }
];

Ionic = function() {};

Ionic.prototype = {
  IONIC_DASH: 'http://virt/',
  IONIC_COOKIES: 'ionic.cookies',
  IONIC_CONFIG: 'ionic.config',
  IONIC_API: 'api/v1/',

  _tryBuildingTask: function() {
    if(argv._.length == 0) {
      return false;
    }
    var taskName = argv._[0];

    return this._getTaskWithName(taskName);
  },

  _getTaskWithName: function(name) {
    for(var i = 0; i < TASKS.length; i++) {
      var t = TASKS[i];
      if(t.name === name) {
        return t;
      }
      if(t.alt) {
        for(var j = 0; j < t.alt.length; j++) {
          var alt = t.alt[j];
          if(alt === name) {
            return t;
          }   
        }
      }
    }
  },

  _printGenericUsage: function() {
    this._printIonic();
    process.stderr.write('Usage: ionic task args\n\n===============\n\nAvailable tasks:\n\n');

    for(var i = 0; i < TASKS.length; i++) {
      var task = TASKS[i];
      process.stderr.write('  ' + task.name + '\t\t' + task.task.HELP_LINE + '\n');
    }

    process.stderr.write('\n');
    process.exit(1);
  },

  _printIonic: function() {
    process.stdout.write('\n   __          __  \n');
    process.stdout.write('| /  \\ |\\ | | /  `\n' + '| \\__/ | \\| | \\__,\n\n');
  },

  _loadTaskRunner: function(which) {

  },

  run: function() {
    var task = this._tryBuildingTask();
    if(!task) {
      return this._printGenericUsage();
    }

    console.log('Running', task.title, 'task...')

    var taskObj = new task.task();
    taskObj.run(this);
  },

  fail: function(msg) {
    process.stderr.write(msg + '\n');
    process.exit(1);
  },

  loadConfig: function() {
    if(!fs.existsSync(this.IONIC_CONFIG)) {
      this.fail('Could not find ' + this.IONIC_CONFIG + '!'+
        ' Please run this command your root ionic project directory with that file.');
    }
    return JSON.parse(fs.readFileSync(this.IONIC_CONFIG));
  },

  saveConfig: function(project) {
    var err = fs.writeFileSync(this.IONIC_CONFIG, JSON.stringify(project, null, 2));
    if(err) {
      process.stderr.write('Error writing ' + ionic.IONIC_CONFIG + ': ' + err + '\n');
    }
  }
  

};

exports.Ionic = Ionic;
