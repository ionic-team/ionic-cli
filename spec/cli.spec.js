var IonicAppLib = require('ionic-app-lib'),
    Ionitron = require('../lib/ionic/ionitron'),
    IonicCli = require('../lib/cli'),
    Q = require('q'),
    Task = require('../lib/ionic/task').Task,
    Utils = IonicAppLib.utils;

describe('Cli', function() {

  beforeEach(function() {
    spyOn(IonicCli, 'processExit');
    spyOn(IonicCli, 'printAvailableTasks');

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
    it('should run checkLatestVersion on run', function() {
      var deferred = Q.defer();
      deferred.resolve();
      spyOn(IonicCli, 'checkLatestVersion').andReturn(deferred);
      IonicCli.run({_: []});
      expect(IonicCli.checkLatestVersion).toHaveBeenCalled();
    });

    it('should run ionitron when argument is passed', function() {
      spyOn(Ionitron, 'print');
      IonicCli.run({ionitron: true});
      expect(Ionitron.print).toHaveBeenCalled();
    });

    it('should listen to verbosity when arg is passed', function() {
      spyOn(IonicAppLib.events, 'on');
      spyOn(IonicCli, 'tryBuildingTask').andReturn(false);
      IonicCli.run({verbose: true});
      expect(IonicAppLib.events.on).toHaveBeenCalledWith('verbose', console.log);
    });

    it('should get version when version flag passed', function() {
      spyOn(IonicCli, 'version');
      IonicCli.run({version: true, _: []});
      expect(IonicCli.version).toHaveBeenCalled();
    });

    it('should call help when help argument passed', function() {
      spyOn(IonicCli, 'printHelpLines');
      IonicCli.run({help: true});
      expect(IonicCli.printHelpLines).toHaveBeenCalled();
    });

    xit('should store the stats opt out if arg passed', function() {
      throw 'TODO Write this test';
    });

    it('should print available tasks if no valid command is passed', function() {
      spyOn(IonicCli, 'tryBuildingTask').andReturn(false);
      IonicCli.run({});
      expect(IonicCli.printAvailableTasks).toHaveBeenCalled();
    });

    it('should call attachErrorHandling', function() {
      spyOn(IonicCli, 'attachErrorHandling');
      IonicCli.run({ _: [] });
      expect(IonicCli.attachErrorHandling).toHaveBeenCalled();
    });

    it('should set up console logging helpers', function() {
      spyOn(IonicCli, 'setUpConsoleLoggingHelpers');
      IonicCli.run({ _: [] });
      expect(IonicCli.setUpConsoleLoggingHelpers).toHaveBeenCalled();
    });

    it('should run the corodva task', function() {
      var fakeTask = function() {};
      fakeTask.prototype = new Task();
      fakeTask.prototype.run = function() {
        // console.log('running');
      }

      spyOn(IonicCli, 'tryBuildingTask').andReturn(true);

      spyOn(fakeTask.prototype, 'run').andCallThrough();
      // var fakeTaskInstance
      // spyOn(fakeTask, 'constructor').allCallThrough();
      spyOn(IonicCli, 'lookupTask').andReturn(fakeTask);
      IonicCli.run({ _: ['cordova', 'run']});
      expect(fakeTask.prototype.run).toHaveBeenCalled();
    });
  });
});
