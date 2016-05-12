var IonicAppLib = require('ionic-app-lib');
var Ionitron = require('../lib/utils/ionitron');
var IonicCli = require('../lib/cli');
var Q = require('q');
var IonicStats = require('../lib/utils/stats').IonicStats;
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
    var fakeTask;

    beforeEach(function() {
      fakeTask = {
        run:  function() {}
      };

      spyOn(IonicCli, 'lookupTask').andReturn(fakeTask);
    });

    describe('#Cli methods', function() {
      it('should run checkLatestVersion on run', function(done) {
        var deferred = Q.defer();
        deferred.resolve();
        spyOn(IonicCli, 'checkLatestVersion').andReturn(deferred);
        IonicCli.run(['node', 'bin/ionic', 'run', 'ios'])
        .then(function() {
          expect(IonicCli.checkLatestVersion).toHaveBeenCalled();
          done();
        });
      });

      xit('should run info doRuntimeCheck on run', function(done) {
        spyOn(IonicCli, 'printHelpLines');
        IonicCli.run(['node', 'bin/ionic', '--h'])
        .then(function() {
          expect(IonicCli.doRuntimeCheck).toHaveBeenCalled();
          done();
        });
      });

      it('should run ionitron when argument is passed', function(done) {
        spyOn(Ionitron, 'print');
        IonicCli.run(['node', 'bin/ionic', '--ionitron'])
        .then(function() {
          expect(Ionitron.print).toHaveBeenCalled();
          done();
        });
      });

      it('should change log level to debug when verbose arg is passed', function(done) {
        expect(IonicAppLib.logging.logger.level).toBe('info');
        IonicCli.run(['node', 'bin/ionic', '--verbose'])
        .then(function() {
          expect(IonicAppLib.logging.logger.level).toBe('debug');
          done();
        });
      });

      it('should get version when version flag passed', function(done) {
        spyOn(IonicCli, 'version');
        IonicCli.run(['node', 'bin/ionic', '--version'])
        .then(function() {
          expect(IonicCli.version).toHaveBeenCalled();
          done();
        });
      });

      it('should call help when help argument passed', function(done) {
        spyOn(IonicCli, 'printHelpLines');
        IonicCli.run(['node', 'bin/ionic', '--help'])
        .then(function() {
          expect(IonicCli.printHelpLines).toHaveBeenCalled();
          done();
        });
      });

      it('should call help when help shorthand argument passed', function(done) {
        spyOn(IonicCli, 'printHelpLines');
        IonicCli.run(['node', 'bin/ionic', '--h'])
        .then(function() {
          expect(IonicCli.printHelpLines).toHaveBeenCalled();
          done();
        });
      });

      it('should print available tasks if no valid command is passed', function(done) {
        IonicCli.run(['node', 'bin/ionic'])
        .then(function() {
          expect(IonicCli.printAvailableTasks).toHaveBeenCalled();
          done();
        });
      });

      it('should get the correct task by name', function() {
        var task = IonicCli.getTaskByName('start');
        expect(task).toBeDefined();
        expect(task.name).toBe('start');
        expect(task.args).toBeDefined();
      });

      it('should call attachErrorHandling', function(done) {
        spyOn(IonicCli, 'attachErrorHandling');
        IonicCli.run(['node', 'bin/ionic'])
        .then(function() {
          expect(IonicCli.attachErrorHandling).toHaveBeenCalled();
          done();
        });
      });

      it('should get boolean options from start task', function() {
        var task = IonicCli.getTaskByName('start');
        var booleanOptions = IonicCli.getListOfBooleanOptions(task.options);

        // We expect 6 total = 3 options, each with short hand notation.
        expect(booleanOptions.length).toBe(11);
      });

      it('should track stats for cli', function(done) {
        spyOn(IonicStats, 't');
        IonicCli.run(['node', 'bin/ionic', 'run', 'ios'])
        .then(function() {
          expect(IonicStats.t).toHaveBeenCalled();
          done();
        });
      });

      it('should change pwd for commands', function(done) {
        IonicCli.run(['node', 'bin/ionic', 'serve'])
        .then(function() {
          expect(Utils.cdIonicRoot).toHaveBeenCalled();
          done();
        });
      });

      it('should not change pwd for commands', function(done) {
        IonicCli.run(['node', 'bin/ionic', 'start'])
        .then(function() {
          expect(Utils.cdIonicRoot).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('#commands options', function() {
    var fakeTask;

    beforeEach(function() {
      fakeTask = {
        run:  function() {}
      };

      spyOn(IonicCli, 'lookupTask').andReturn(fakeTask);
      spyOn(fakeTask, 'run').andCallThrough();
    });

    it('should parse start options correctly', function(done) {
      var processArgs = ['node', '/usr/local/bin/ionic', 'start', 's1', '-w', '--appname', 'asdf'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

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
      var processArgs = ['node', '/usr/local/bin/ionic', 'serve', '--nogulp', '--all', '--browser', 'firefox'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

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
      var processArgs = ['node', '/usr/local/bin/ionic', 'upload', '--email',
        'user@ionic.io', '--password', 'pass', '--note', note];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.note).toBe(note);
        expect(taskArgv.email).toBe('user@ionic.io');
        expect(taskArgv.password).toBe('pass');
        done();
      });
    });

    it('should parse login options correctly', function(done) {
      var processArgs = ['node', '/usr/local/bin/ionic', 'login', '--email', 'user@ionic.io', '--password', 'pass'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.email).toBe('user@ionic.io');
        expect(taskArgv.password).toBe('pass');
        done();
      });
    });

    it('should parse run options correctly', function(done) {
      var processArgs = ['node', '/usr/local/bin/ionic', 'run', 'ios', '--livereload',
        '--port', '5000', '-r', '35730', '--consolelogs', '--serverlogs', '--device'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv.r).toBe(35730);
        expect(taskArgv.port).toBe(5000);
        expect(taskArgv.consolelogs).toBe(true);
        expect(taskArgv.serverlogs).toBe(true);
        expect(taskArgv.livereload).toBe(true);
        expect(taskArgv.device).toBe(true);
        done();
      });
    });

    it('should parse emulate options correctly', function(done) {
      var processArgs = ['node', '/usr/local/bin/ionic', 'emulate', 'android',
        '--livereload', '--address', 'localhost', '--port', '5000', '-r', '35730', '--consolelogs', '--serverlogs'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[1]).toBe('android');
        expect(taskArgv.r).toBe(35730);
        expect(taskArgv.address).toBe('localhost');
        expect(taskArgv.port).toBe(5000);
        expect(taskArgv.consolelogs).toBe(true);
        expect(taskArgv.serverlogs).toBe(true);
        expect(taskArgv.livereload).toBe(true);
        done();
      });
    });

    it('should parse state options correctly', function(done) {
      var processArgs = ['node', '/usr/local/bin/ionic', 'state', 'save', '--plugins'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

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
      var processArgs = ['node', '/usr/local/bin/ionic', 'plugin', 'add',
        'org.apache.cordova.splashscreen', '--nosave', '--searchpath', '../'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

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
      var processArgs = ['node', '/usr/local/bin/ionic', 'build', 'ios', '--nohooks'];

      var promise = IonicCli.run(processArgs);

      promise.then(function() {
        var taskArgs = fakeTask.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[0]).toBe('build');
        expect(taskArgv._[1]).toBe('ios');
        expect(taskArgv.nohooks).toBe(true);
        done();
      });
    });

    describe('version checking for checkRuntime', function() {
      var IonicCli;
      beforeEach(function() {
        IonicCli = rewire('../lib/cli');
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
