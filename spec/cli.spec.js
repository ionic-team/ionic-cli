var IonicAppLib = require('ionic-app-lib'),
    Ionitron = require('../lib/ionic/ionitron'),
    IonicCli = require('../lib/cli'),
    LoginTask = require('../lib/ionic/login'),
    Q = require('q'),
    Task = require('../lib/ionic/task').Task,
    Utils = IonicAppLib.utils;

describe('Cli', function() {

  beforeEach(function() {
    spyOn(IonicCli, 'processExit');
    spyOn(IonicCli, 'printAvailableTasks');
    spyOn(IonicAppLib.events, 'on');
    spyOn(process, 'on');

    spyOn(Utils, 'fail').andCallFake(function(err){
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
      var fakeTask = function() {};
      fakeTask.prototype = new Task();
      fakeTask.prototype.run = function() {};

      spyOn(IonicCli, 'lookupTask').andReturn(fakeTask);
    });

    describe('#Cli methods', function() {
      it('should run checkLatestVersion on run', function() {
        var deferred = Q.defer();
        deferred.resolve();
        spyOn(IonicCli, 'checkLatestVersion').andReturn(deferred);
        IonicCli.run(['node', 'bin/ionic', 'run', 'ios']);
        expect(IonicCli.checkLatestVersion).toHaveBeenCalled();
      });

      it('should run ionitron when argument is passed', function() {
        spyOn(Ionitron, 'print');
        IonicCli.run(['node', 'bin/ionic', '--ionitron']);
        expect(Ionitron.print).toHaveBeenCalled();
      });

      it('should listen to verbosity when arg is passed', function() {
        spyOn(IonicCli, 'tryBuildingTask').andReturn(false);
        IonicCli.run(['node', 'bin/ionic', '--verbose']);
        expect(IonicAppLib.events.on).toHaveBeenCalledWith('verbose', console.log);
      });

      it('should get version when version flag passed', function() {
        spyOn(IonicCli, 'version');
        IonicCli.run(['node', 'bin/ionic', '--version']);
        expect(IonicCli.version).toHaveBeenCalled();
      });

      it('should call help when help argument passed', function() {
        spyOn(IonicCli, 'printHelpLines');
        IonicCli.run(['node', 'bin/ionic', '--help']);
        expect(IonicCli.printHelpLines).toHaveBeenCalled();
      });

      it('should call help when help shorthand argument passed', function() {
        spyOn(IonicCli, 'printHelpLines');
        IonicCli.run(['node', 'bin/ionic', '--h']);
        expect(IonicCli.printHelpLines).toHaveBeenCalled();
      });

      it('should print available tasks if no valid command is passed', function() {
        spyOn(IonicCli, 'tryBuildingTask').andReturn(false);
        IonicCli.run(['node', 'bin/ionic']);
        expect(IonicCli.printAvailableTasks).toHaveBeenCalled();
      });

      it('should call attachErrorHandling', function() {
        spyOn(IonicCli, 'attachErrorHandling');
        IonicCli.run(['node', 'bin/ionic']);
        expect(IonicCli.attachErrorHandling).toHaveBeenCalled();
      });

      it('should set up console logging helpers', function() {
        spyOn(IonicCli, 'setUpConsoleLoggingHelpers');
        IonicCli.run(['node', 'bin/ionic']);
        expect(IonicCli.setUpConsoleLoggingHelpers).toHaveBeenCalled();
      });

      it('should get boolean options from start task', function() {
        var tasks = require('../lib/tasks/cliTasks');
        var task = tasks[0];//start task
        var booleanOptions = IonicCli.getBooleanOptionsForTask(task);
        //We expect 6 total = 3 options, each with short hand notation.
        expect(booleanOptions.length).toBe(6);
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

    it('should parse start options correctly', function() {
      var processArgs = [ 'node', '/usr/local/bin/ionic', 'start', 's1', '-w', '--appname', 'asdf'];
      var tasks = require('../lib/tasks/cliTasks');
      var task = tasks[0];//start task

      IonicCli.run(processArgs);

      expect(fakeTask.prototype.run).toHaveBeenCalled();
      var taskArgs = fakeTask.prototype.run.mostRecentCall.args;

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
    });

    it('should parse serve options correctly', function() {
      var processArgs = [ 'node', '/usr/local/bin/ionic', 'serve', '--nogulp', '--all', '--browser', 'firefox'];
      var tasks = require('../lib/tasks/cliTasks');
      var task = tasks[1];//serve task

      IonicCli.run(processArgs);

      expect(fakeTask.prototype.run).toHaveBeenCalled();
      var taskArgs = fakeTask.prototype.run.mostRecentCall.args;

      var taskArgv = taskArgs[1];
      // console.log('taskArgv', taskArgv);
      //should only have serve in the command args
      expect(taskArgv._.length).toBe(1);
      expect(taskArgv.browser).toBe('firefox');
      expect(taskArgv.nogulp).toBe(true);
      expect(taskArgv.all).toBe(true);
      expect(taskArgv.lab).toBe(false);
      expect(taskArgv.nobrowser).toBe(false);

    });


    it('should parse upload options correctly', function() {
      var note = 'A note for notes';
      var processArgs = [ 'node', '/usr/local/bin/ionic', 'upload', '--email', 'user@ionic.io', '--password', 'pass', '--note', note];
      var tasks = require('../lib/tasks/cliTasks');
      var task = tasks[1];//serve task

      IonicCli.run(processArgs);

      expect(fakeTask.prototype.run).toHaveBeenCalled();
      var taskArgs = fakeTask.prototype.run.mostRecentCall.args;

      var taskArgv = taskArgs[1];
      
      //should only have serve in the command args
      expect(taskArgv._.length).toBe(1);
      expect(taskArgv.note).toBe(note);
      expect(taskArgv.email).toBe('user@ionic.io');
      expect(taskArgv.password).toBe('pass');

    });
  });
});
