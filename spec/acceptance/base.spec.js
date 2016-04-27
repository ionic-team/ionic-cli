var IonicAppLib = require('ionic-app-lib');
var IonicCli = require('../../lib/cli');

var ionic = require('../helpers/ionic');

var Task = require('../../lib/ionic/task').Task;
var Info = IonicAppLib.info;
var Utils = IonicAppLib.utils;
var Project = IonicAppLib.project;
var rewire = require('rewire');

describe('Cli', function() {

  beforeEach(function() {
    spyOn(IonicCli, 'processExit');
    spyOn(IonicCli, 'printAvailableTasks');
    spyOn(IonicCli, 'doRuntimeCheck');
    spyOn(IonicAppLib.events, 'on');
    spyOn(process, 'on');
    spyOn(Info, 'checkRuntime');
    spyOn(Utils, 'cdIonicRoot');
    spyOn(Project, 'load');

    spyOn(Utils, 'fail').andCallFake(function(err) {
      console.log(err);
      console.log(err.stack);
      throw err;
    });
  });

  it('should have cli defined', function() {
    expect(IonicCli).toBeDefined();
  });

  it('should have cli tasks defined', function() {
    expect(IonicCli.Tasks).toBeDefined();
  });

  describe('#run', function() {

    beforeEach(function() {
      function fakeTask() {}
      fakeTask.prototype = new Task();
      fakeTask.prototype.run = function() {};

      spyOn(IonicCli, 'lookupTask').andReturn(fakeTask);
    });

    describe('#Cli methods', function() {

      it('should print available tasks if no valid command is passed', function() {
        ionic([]).then(function() {

        });
      });

      it('should get the correct task by name', function() {
        var task = IonicCli.getTaskByName('start');
        expect(task).toBeDefined();
        expect(task.name).toBe('start');
        expect(task.args).toBeDefined();
      });

      it('should call attachErrorHandling', function() {
        spyOn(IonicCli, 'attachErrorHandling');
        ionic([]);
        expect(IonicCli.attachErrorHandling).toHaveBeenCalled();
      });

      it('should get boolean options from start task', function() {
        var task = IonicCli.getTaskByName('start');
        var booleanOptions = IonicCli.getListOfBooleanOptions(task.options);

        // We expect 6 total = 3 options, each with short hand notation.
        expect(booleanOptions.length).toBe(11);
      });

      it('should change pwd for commands', function() {
        ionic([
          'serve'
        ]);
        expect(Utils.cdIonicRoot).toHaveBeenCalled();
      });

      it('should not change pwd for commands', function() {
        ionic([
          'start'
        ]);
        expect(Utils.cdIonicRoot).not.toHaveBeenCalled();
      });
    });
  });

  describe('#commands options', function() {
    var fakeTask;

    beforeEach(function() {
      fakeTask = function() {};
      fakeTask.prototype = new Task();
      fakeTask.prototype.run = function() {};

      spyOn(IonicCli, 'lookupTask').andReturn(fakeTask);
      spyOn(fakeTask.prototype, 'run').andCallThrough();

    });

    it('should parse start options correctly', function(done) {
      var processArgs = [
        'start',
        's1',
        '-w',
        '--appname',
        'asdf'
      ];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[0]).toBe('start');
        expect(taskArgv._[1]).toBe('s1');
        expect(taskArgv.appname).toBe('asdf');
        expect(taskArgv.s).toBe(false);
        expect(taskArgv.sass).toBe(false);
        expect(taskArgv.l).toBe(false);
        expect(taskArgv.list).toBe(false);
        expect(taskArgv['no-cordova']).toBe(false);
        expect(taskArgv.w).toBe(true);
        expect(taskArgv.id).toBeUndefined();
        expect(taskArgv.i).toBeUndefined();
        done();
      });
    });

    it('should parse serve options correctly', function(done) {
      var processArgs = [
        'serve',
        '--nogulp',
        '--all',
        '--browser',
        'firefox'
      ];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.browser).toBe('firefox');
        expect(taskArgv.nogulp).toBe(true);
        expect(taskArgv.all).toBe(true);
        expect(taskArgv.lab).toBe(false);
        expect(taskArgv.nobrowser).toBe(false);
        done();
      });
    });


    it('should parse upload options correctly', function(done) {
      var note = 'A note for notes';
      var email = 'user@ionic.io';
      var password = 'pass';

      var processArgs = [
        'upload',
        '--email', email,
        '--password', password,
        '--note', note
      ];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.note).toBe(note);
        expect(taskArgv.email).toBe(email);
        expect(taskArgv.password).toBe(password);
        done();
      });
    });

    it('should parse login options correctly', function(done) {
      var email = 'user@ionic.io';
      var password = 'pass';

      var processArgs = [
        'login',
        '--email', email,
        '--password', password
      ];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.email).toBe(email);
        expect(taskArgv.password).toBe(password);
        done();
      });
    });

    it('should parse run options correctly', function(done) {
      var platform = 'ios';
      var port = 5000;
      var r = 35730;

      var processArgs = [
        'run',
        platform,
        '--livereload',
        '--port', port,
        '-r', r,
        '--consolelogs',
        '--serverlogs',
        '--device'];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[1]).toBe(platform);
        expect(taskArgv.port).toBe(port);
        expect(taskArgv.r).toBe(r);
        expect(taskArgv.consolelogs).toBe(true);
        expect(taskArgv.serverlogs).toBe(true);
        expect(taskArgv.livereload).toBe(true);
        expect(taskArgv.device).toBe(true);
        done();
      });
    });

    it('should parse emulate options correctly', function(done) {
      var platform = 'android';
      var address = 'localhost';
      var port = 5000;
      var r = 35730;

      var processArgs = [
        'emulate',
        platform,
        '--livereload',
        '--address', address,
        '--port', port,
        '-r', r,
        '--consolelogs',
        '--serverlogs'];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[1]).toBe(platform);
        expect(taskArgv.address).toBe(address);
        expect(taskArgv.port).toBe(port);
        expect(taskArgv.r).toBe(r);
        expect(taskArgv.consolelogs).toBe(true);
        expect(taskArgv.serverlogs).toBe(true);
        expect(taskArgv.livereload).toBe(true);
        done();
      });
    });

    it('should parse state options correctly', function(done) {
      var processArgs = [
        'state',
        'save',
        '--plugins'
      ];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[1]).toBe('save');
        expect(taskArgv.plugins).toBe(true);
        expect(taskArgv.platforms).toBe(false);
        done();
      });
    });

    it('should parse plugin options correctly', function(done) {
      var processArgs = [
        'plugin',
        'add',
        'org.apache.cordova.splashscreen',
        '--nosave',
        '--searchpath', '../'
      ];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(3);
        expect(taskArgv._[0]).toBe('plugin');
        expect(taskArgv._[1]).toBe('add');
        expect(taskArgv._[2]).toBe('org.apache.cordova.splashscreen');
        expect(taskArgv.nosave).toBe(true);
        expect(taskArgv.searchpath).toBe('../');
        done();
      });
    });

    it('should parse build options correctly', function(done) {
      var platform = 'ios';

      var processArgs = [
        'build',
        platform,
        '--nohooks'
      ];

      var promise = ionic(processArgs);
      var fakeTaskRef = fakeTask;

      promise.then(function() {
        expect(fakeTaskRef.prototype.run).toHaveBeenCalled();
        var taskArgs = fakeTaskRef.prototype.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[0]).toBe('build');
        expect(taskArgv._[1]).toBe(platform);
        expect(taskArgv.nohooks).toBe(true);
        done();
      });
    });

    describe('version checking for checkRuntime', function() {
      var IonicCli;
      beforeEach(function() {
        IonicCli = rewire('../../lib/cli');
      });

      xit('should do runtime check when version is not checked', function() {
        var IonicConfigSpy = jasmine.createSpyObj('IonicConfig', ['get', 'set', 'save']);
        IonicConfigSpy.get.andReturn('1.6.4');
        IonicCli.__set__('IonicConfig', IonicConfigSpy);
        IonicCli.doRuntimeCheck('1.6.4');
        expect(Info.checkRuntime).not.toHaveBeenCalled();
        expect(IonicConfigSpy.set).not.toHaveBeenCalled();
        expect(IonicConfigSpy.save).not.toHaveBeenCalled();
      });

      xit('should do runtime check when version is not checked', function() {
        var IonicConfigSpy = jasmine.createSpyObj('IonicConfig', ['get', 'set', 'save']);
        IonicConfigSpy.get.andReturn('1.6.4');
        IonicCli.__set__('IonicConfig', IonicConfigSpy);
        IonicCli.doRuntimeCheck('1.6.5');
        expect(Info.checkRuntime).toHaveBeenCalled();
        expect(IonicConfigSpy.get).toHaveBeenCalled();
        expect(IonicConfigSpy.set).toHaveBeenCalledWith('lastVersionChecked', '1.6.5');
        expect(IonicConfigSpy.save).toHaveBeenCalled();
      });
    });
  });
});
