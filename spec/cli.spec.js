'use strict';

var IonicAppLib = require('ionic-app-lib');
var semver = require('semver');
var optimist = require('optimist');
var Ionitron = require('../lib/utils/ionitron');
var Q = require('q');
var helpUtils = require('../lib/utils/help');
var IonicStore = require('../lib/utils/store');
var IonicStats = require('../lib/utils/stats');
var Info = IonicAppLib.info;
var Utils = IonicAppLib.utils;
var Project = IonicAppLib.project;
var Logging = IonicAppLib.logging;
var log = Logging.logger;
var fs = require('fs');
var path = require('path');
var rewire = require('rewire');
var IonicCli = rewire('../lib/cli');
var gulp = require('gulp');

describe('Cli', function() {

  beforeEach(function() {
    spyOn(IonicStats, 't');
    spyOn(IonicCli, 'processExit');
    spyOn(helpUtils, 'printTaskListShortUsage');
    spyOn(helpUtils, 'printTaskListUsage');
    spyOn(IonicAppLib.events, 'on');
    spyOn(process, 'on');
    spyOn(Info, 'checkRuntime');
    spyOn(Utils, 'cdIonicRoot');
    spyOn(Project, 'load');

    spyOn(Utils, 'fail').andCallFake(function(err) {
      console.log(err);
      console.log(err.stack);
    });
  });

  it('should have cli defined', function() {
    expect(IonicCli).toBeDefined();
  });

  it('should have cli tasks defined', function() {
    expect(IonicCli.ALL_TASKS).toBeDefined();
  });

  describe('#run', function() {

    beforeEach(function() {
      spyOn(IonicCli, 'doRuntimeCheck');
    });

    describe('#Cli methods', function() {
      it('should run checkLatestVersion on run', function(done) {
        spyOn(IonicCli, 'checkLatestVersion').andReturn(Q(true));

        IonicCli.run(['node', 'bin/ionic', '--h'])
        .then(function() {
          expect(IonicCli.checkLatestVersion).toHaveBeenCalled();
          done();
        });
      });

      it('should run info doRuntimeCheck on run', function(done) {
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

        IonicCli.run(['node', 'bin/ionic', '--help'])
        .then(function() {
          expect(helpUtils.printTaskListUsage).toHaveBeenCalled();
          done();
        });
      });

      it('should call help when help shorthand argument passed', function(done) {

        IonicCli.run(['node', 'bin/ionic', '--h'])
        .then(function() {
          expect(helpUtils.printTaskListUsage).toHaveBeenCalled();
          done();
        });
      });

      it('should print available tasks if no valid command is passed', function(done) {

        IonicCli.run(['node', 'bin/ionic'])
        .then(function() {
          expect(helpUtils.printTaskListShortUsage).toHaveBeenCalled();
          done();
        });
      });

      it('should get the correct task by name', function() {
        var task = IonicCli.getTaskSettingsByName('start');
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
        var task = IonicCli.getTaskSettingsByName('start');
        var booleanOptions = IonicCli.getListOfBooleanOptions(task.options);

        // We expect 6 total = 3 options, each with short hand notation.
        expect(booleanOptions.length).toBe(9);
      });

      it('should track stats for cli', function(done) {

        IonicCli.run(['node', 'bin/ionic', 'help'])
        .then(function() {
          expect(IonicStats.t).toHaveBeenCalled();
          done();
        });
      });

      it('should not track stats for cli for a bogus command', function(done) {

        IonicCli.run(['node', 'bin/ionic', 'helper'])
        .then(function() {
          expect(IonicStats.t).not.toHaveBeenCalled();
          done();
        });
      });

      it('should change cwd to project root for project tasks', function(done) {
        var processArguments = ['node', 'bin/ionic', 'fake'];
        var rawCliArguments = processArguments.slice(2);
        var argv = optimist(rawCliArguments).argv;

        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {
            return Q(true);
          },
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(FakeTask, 'run').andReturn(Q(true));

        IonicCli.run(processArguments)
        .then(function() {
          expect(Utils.cdIonicRoot).toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
          done();
        });
      });

      it('should skip loading gulpfile if node_modules does not exist', function(done) {
        var processArguments = ['node', 'bin/ionic', 'fake'];
        var rawCliArguments = processArguments.slice(2);
        var argv = optimist(rawCliArguments).argv;

        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {
            return Q(true);
          },
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(fs, 'existsSync').andReturn(false);
        spyOn(FakeTask, 'run').andReturn(Q(true));
        spyOn(IonicCli, 'loadGulpfile');
        spyOn(IonicCli, 'runWithGulp');

        IonicCli.run(processArguments)
        .then(function() {
          expect(IonicCli.loadGulpfile).not.toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
          done();
        });
      });

      it('should skip runWithGulp if a gulpfile does not exist', function(done) {
        var processArguments = ['node', 'bin/ionic', 'fake'];
        var rawCliArguments = processArguments.slice(2);
        var argv = optimist(rawCliArguments).argv;

        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {
            return Q(true);
          },
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(fs, 'existsSync').andReturn(true);
        spyOn(IonicCli, 'loadGulpfile').andReturn(false);
        spyOn(FakeTask, 'run').andReturn(Q(true));
        spyOn(IonicCli, 'runWithGulp');

        IonicCli.run(processArguments)
        .then(function() {
          expect(IonicCli.loadGulpfile).toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
          done();
        });
      });

      it('should not change cwd to project root for non project tasks', function(done) {
        var processArguments = ['node', 'bin/ionic', 'fake'];
        var rawCliArguments = processArguments.slice(2);
        var argv = optimist(rawCliArguments).argv;

        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {
            return Q(true);
          },
          isProjectTask: false
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(FakeTask, 'run').andReturn(Q(true));

        IonicCli.run(processArguments)
        .then(function() {
          expect(Utils.cdIonicRoot).not.toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
          done();
        });
      });

      it('should print a warning if node_modules doesn\'t exist and using v2', function(done) {
        spyOn(fs, 'existsSync').andReturn(false);
        Project.load = function() {
          return {
            get: function() { return true; } // return v2 === true
          };
        };

        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {
            return Q(true);
          },
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(IonicCli, 'runWithGulp');
        spyOn(log, 'warn');
        IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(log.warn.calls[0].args[0]).toMatch(
            'WARN: No node_modules directory found, do you need to run npm install?'
          );
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          done();
        });
      });

      it('should warn if cmd requires build step and gulpfile doesn\'t exist and using v2', function(done) {
        var FakeTask = {
          name: 'build',
          title: 'build',
          run: function() {},
          isProjectTask: true
        };
        Project.load = function() {
          return {
            get: function() { return true; } // return v2 === true
          };
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(FakeTask, 'run').andReturn(Q(true));
        spyOn(fs, 'existsSync').andReturn(true);
        spyOn(IonicCli, 'loadGulpfile').andReturn(false);
        spyOn(IonicCli, 'loadNpmScripts').andReturn(false);
        spyOn(log, 'warn');

        IonicCli.run(['node', 'bin/ionic', 'build'])
        .then(function() {
          expect(log.warn).toHaveBeenCalledWith('WARN: No build file found!');
          done();
        });
      });

      it('should not runWithGulp if a gulpfile doesn\'t exist', function(done) {
        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {},
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(IonicCli, 'runWithGulp');
        spyOn(FakeTask, 'run').andReturn(Q(true));
        spyOn(fs, 'existsSync').andReturn(true);
        spyOn(IonicCli, 'loadGulpfile').andReturn(false);
        spyOn(IonicCli, 'loadNpmScripts').andReturn(false);

        IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.loadGulpfile).toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          done();
        });
      });

      it('should not runWithGulp if npmScripts exist', function(done) {
        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {},
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(IonicCli, 'runWithGulp');
        spyOn(FakeTask, 'run').andReturn(Q(true));
        spyOn(fs, 'existsSync').andReturn(true);
        spyOn(IonicCli, 'loadGulpfile').andReturn(false);
        spyOn(IonicCli, 'loadNpmScripts').andReturn(true);

        IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.loadGulpfile).toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          done();
        });
      });

      it('should runWithGulp', function(done) {
        var FakeTask = {
          name: 'fake',
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(IonicCli, 'runWithGulp').andReturn(Q(true));
        spyOn(IonicCli, 'runWithNpmScripts').andReturn(Q(true));
        spyOn(fs, 'existsSync').andReturn(true);
        spyOn(IonicCli, 'loadGulpfile').andReturn(true);
        spyOn(IonicCli, 'loadNpmScripts').andReturn({});

        IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.runWithGulp).toHaveBeenCalled();
          expect(IonicCli.runWithNpmScripts).not.toHaveBeenCalled();
          done();
        });
      });

      it('should runWithNpmScripts without Gulpfile', function(done) {
        var FakeTask = {
          name: 'fake',
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(IonicCli, 'runWithGulp').andReturn(Q(true));
        spyOn(IonicCli, 'runWithNpmScripts').andReturn(Q(true));
        spyOn(fs, 'existsSync').andReturn(true);
        spyOn(IonicCli, 'loadGulpfile').andReturn(false);
        spyOn(IonicCli, 'loadNpmScripts').andReturn({
          'fake:before': true
        });

        IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(IonicCli.runWithNpmScripts).toHaveBeenCalled();
          done();
        });
      });

      it('should runWithNpmScripts even with Gulpfile', function(done) {
        var FakeTask = {
          name: 'fake',
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').andReturn(FakeTask);
        spyOn(IonicCli, 'runWithGulp').andReturn(Q(true));
        spyOn(IonicCli, 'runWithNpmScripts').andReturn(Q(true));
        spyOn(fs, 'existsSync').andReturn(true);
        spyOn(IonicCli, 'loadGulpfile').andReturn(true);
        spyOn(IonicCli, 'loadNpmScripts').andReturn({
          'fake:before': true
        });

        IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(IonicCli.runWithNpmScripts).toHaveBeenCalled();
          done();
        });
      });

      it('should call Utils.fail if an exception occurrs within run', function(done) {
        var error = new Error('error happened');
        spyOn(IonicCli, 'checkLatestVersion').andCallFake(function() {
          return Q.reject(error);
        });

        IonicCli.run(['node', 'bin/ionic', '--stats-opt-out']).fin(function() {
          expect(Utils.fail).toHaveBeenCalledWith(error);
          done();
        });
      });

      it('should save to the config if stats-opt-out is passed', function(done) {
        spyOn(IonicStore.prototype, 'set');
        spyOn(IonicStore.prototype, 'save');

        IonicCli.run(['node', 'bin/ionic', '--stats-opt-out'])
        .then(function() {
          expect(IonicStore.prototype.set).toHaveBeenCalledWith('statsOptOut', true);
          expect(IonicStore.prototype.save).toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('#commands options', function() {
    beforeEach(function() {
      spyOn(IonicCli, 'doRuntimeCheck');
    });

    it('should parse start options correctly', function(done) {
      var Start = require('../lib/ionic/start');
      spyOn(Start, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'start', 's1', '-w', '--appname', 'asdf'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Start.run.mostRecentCall.args;

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
      var Serve = require('../lib/ionic/serve');
      spyOn(Serve, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'serve', '--nogulp', '--all', '--browser', 'firefox'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Serve.run.mostRecentCall.args;

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
      var Upload = require('../lib/ionic/upload');
      spyOn(Upload, 'run').andReturn(Q(true));

      var note = 'A note for notes';
      var processArgs = ['node', '/usr/local/bin/ionic', 'upload', '--email',
        'user@ionic.io', '--password', 'pass', '--note', note];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Upload.run.mostRecentCall.args;

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
      var Login = require('../lib/ionic/login');
      spyOn(Login, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'login', '--email', 'user@ionic.io', '--password', 'pass'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Login.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.email).toBe('user@ionic.io');
        expect(taskArgv.password).toBe('pass');
        done();
      }).catch(done);
    });

    it('should parse run options correctly', function(done) {
      var Run = require('../lib/ionic/run');
      spyOn(Run, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'run', 'ios', '--livereload',
        '--port', '5000', '-r', '35730', '--consolelogs', '--serverlogs', '--device'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Run.run.mostRecentCall.args;

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
      var Emulate = require('../lib/ionic/emulate');
      spyOn(Emulate, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'emulate', 'android',
        '--livereload', '--address', 'localhost', '--port', '5000', '-r', '35730', '--consolelogs', '--serverlogs'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Emulate.run.mostRecentCall.args;

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
      var State = require('../lib/ionic/state');
      spyOn(State, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'state', 'save', '--plugins'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = State.run.mostRecentCall.args;

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
      var Plugin = require('../lib/ionic/plugin');
      spyOn(Plugin, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'plugin', 'add',
        'org.apache.cordova.splashscreen', '--nosave', '--searchpath', '../'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Plugin.run.mostRecentCall.args;

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
      var Build = require('../lib/ionic/build');
      spyOn(Build, 'run').andReturn(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'build', 'ios', '--nohooks'];

      IonicCli.run(processArgs).then(function() {
        var taskArgs = Build.run.mostRecentCall.args;

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
        var revertConfig = IonicCli.__set__('IonicConfig', IonicConfigSpy);
        IonicCli.doRuntimeCheck('1.6.4');

        expect(Info.checkRuntime).not.toHaveBeenCalled();
        expect(IonicConfigSpy.set).not.toHaveBeenCalled();
        expect(IonicConfigSpy.save).not.toHaveBeenCalled();
        revertConfig();
      });

      xit('should do runtime check when version is not checked', function() {
        var IonicConfigSpy = jasmine.createSpyObj('IonicConfig', ['get', 'set', 'save']);
        IonicConfigSpy.get.andReturn('1.6.4');
        var revertConfig = IonicCli.__set__('IonicConfig', IonicConfigSpy);
        IonicCli.doRuntimeCheck('1.6.5');

        expect(Info.checkRuntime).toHaveBeenCalled();
        expect(IonicConfigSpy.get).toHaveBeenCalled();
        expect(IonicConfigSpy.set).toHaveBeenCalledWith('lastVersionChecked', '1.6.5');
        expect(IonicConfigSpy.save).toHaveBeenCalled();
        revertConfig();
      });
    });
  });

  describe('runWithGulp function', function() {
    var fakeTask;
    var argv;
    var rawCliArguments;
    var qCallbacks;

    beforeEach(function() {
      fakeTask = {
        name: 'fake',
        title: 'fake',
        run: function() {
          return Q(true);
        },
        isProjectTask: true
      };
      argv = {
        _: ['fake'],
        v2: true
      };
      rawCliArguments = ['fake', '--v2'];
      gulp.tasks = {
        'fake:before': function() {},
        'fake:after': function() {}
      };
      qCallbacks = [];

      // gulp.start gets called with nfcall because it's async with a callback
      // so we stub our own function with a callback instead of creating a spy
      // (which is sync). We also track the callbacks because they are created
      // at runtime by Q.nfcall so we can tell jasmine what to expect.
      gulp.start = function(taskName, cb) {
        qCallbacks.push(cb);
        cb();
      };
      spyOn(gulp, 'start').andCallThrough();
      spyOn(IonicCli, 'loadGulpfile').andReturn(true);
      spyOn(fakeTask, 'run').andCallThrough();
      spyOn(process, 'exit');
      spyOn(IonicCli, 'logEvents');
      spyOn(log, 'error');
      spyOn(fs, 'existsSync');
    });

    it('should try to load gulp, exit if it fails', function() {
      spyOn(path, 'resolve').andReturn('./wrong_path');

      IonicCli.runWithGulp(argv, fakeTask, rawCliArguments);

      expect(log.error).toHaveBeenCalledWith('\nGulpfile detected, but gulp is not installed'.red);
      expect(log.error).toHaveBeenCalledWith('Do you need to run `npm install`?\n'.red);
      expect(process.exit).toHaveBeenCalled();

      expect(IonicCli.logEvents).not.toHaveBeenCalled();
      expect(fakeTask.run).not.toHaveBeenCalled();
      expect(gulp.start).not.toHaveBeenCalled();
    });


    it('should run logEvents, the command and the gulp hooks', function(done) {
      IonicCli.runWithGulp(argv, fakeTask, rawCliArguments).then(function() {

        expect(IonicCli.logEvents).toHaveBeenCalled();
        expect(gulp.start).toHaveBeenCalledWith('fake:before', qCallbacks[0]);
        expect(gulp.start).toHaveBeenCalledWith('fake:after', qCallbacks[1]);
        expect(fakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);

        expect(log.error).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
        expect(fs.existsSync).not.toHaveBeenCalled();
        done();
      }).catch(done);
    });

    it('should warn if no gulp task and using v2 and cmd requires build', function(done) {
      argv._[0] = 'build';
      spyOn(log, 'warn');
      gulp.start = function(taskName, cb) {
        cb({
          missingTask: true
        });
      };
      IonicCli.runWithGulp(argv, fakeTask).then(function() {
        expect(log.warn).toHaveBeenCalledWith(('WARN: No \'build:before\' gulp task found!').yellow);
        done();
      });
    });
  });

  describe('loadGulpfile function', function() {
    it('should return true if gulpfile found', function() {
      var mock = require('mock-require');
      var gulpfilePath = path.resolve(process.cwd() + '/gulpfile.js');
      mock(gulpfilePath, {});

      var result = IonicCli.loadGulpfile();
      expect(result).toBe(true);

      mock.stop(gulpfilePath);
    });

    it('should return false if gulpfile not found', function() {
      var result = IonicCli.loadGulpfile();
      expect(result).toBe(false);
    });
  });

  describe('processExit method', function() {
  });

  describe('printVersionWarning method', function() {
    it('should write out a warning if the version is not equal to version specified by the cli', function() {
      spyOn(log, 'warn');

      IonicCli.printVersionWarning('2.0.1', '2.0.2');
      expect(log.warn).toHaveBeenCalled();
    });
    it('should not write out a warning if the version is equal to version specified by the cli', function() {
      spyOn(log, 'warn');

      IonicCli.printVersionWarning('2.0.1', '2.0.1');
      expect(log.warn).not.toHaveBeenCalled();
    });

    it('should not write out a warning if the version is in beta', function() {
      spyOn(log, 'warn');

      IonicCli.printVersionWarning('2.0.1-beta', '2.0.1');
      expect(log.warn).not.toHaveBeenCalled();
    });

    it('should not write out a warning if the version is in alpha', function() {
      spyOn(log, 'warn');

      IonicCli.printVersionWarning('2.0.1-alpha', '2.0.1');
      expect(log.warn).not.toHaveBeenCalled();
    });
  });

  describe('formatGulpError function', function() {
    it('should return e.message if e.err is null', function() {
      var error = new Error('gulp broke');
      error.err = null;

      var results = IonicCli.formatGulpError(error);
      expect(results).toEqual(error.message);
    });

    it('should return a string if the error is in a plugin', function() {
      var error = {
        err: {
          showStack: 'boolean'
        }
      };

      var results = IonicCli.formatGulpError(error);
      expect(results).toEqual(jasmine.any(String));
    });

    it('should return a stack if it exists', function() {
      var testError = new Error('gulp broke');
      var error = {
        err: testError
      };

      var results = IonicCli.formatGulpError(error);
      expect(results).toEqual(testError.stack);
    });

    it('should return a new error if it does not understand the error', function() {
      var error = {
        err: 'Something broke somewhere'
      };
      var results = IonicCli.formatGulpError(error);
      expect(results).toContain(error.err);
    });
  });

  describe('checkLatestVersion method', function() {
    it('should not check npm if current version is a beta', function() {
      spyOn(IonicStore.prototype, 'get');
      spyOn(IonicStore.prototype, 'set');
      spyOn(IonicStore.prototype, 'save');
      var npmVersion = IonicCli.npmVersion;

      var result = IonicCli.checkLatestVersion('2.0.1-beta');
      expect(result).toEqual(null);
      expect(npmVersion).toEqual(IonicCli.npmVersion);
      expect(IonicStore.prototype.get).not.toHaveBeenCalled();
      expect(IonicStore.prototype.set).not.toHaveBeenCalled();
      expect(IonicStore.prototype.save).not.toHaveBeenCalled();
    });

    it('should not check npm if timestamp is recent', function() {
      spyOn(IonicStore.prototype, 'get').andReturn(new Date().getTime());
      spyOn(IonicStore.prototype, 'set');
      spyOn(IonicStore.prototype, 'save');
      var npmVersion = IonicCli.npmVersion;

      var result = IonicCli.checkLatestVersion('2.0.1');
      expect(result).toEqual(null);
      expect(npmVersion).toEqual(IonicCli.npmVersion);
      expect(IonicStore.prototype.set).not.toHaveBeenCalled();
      expect(IonicStore.prototype.save).not.toHaveBeenCalled();
    });

    it('should check npm if timestamp is recent', function(done) {
      spyOn(IonicStore.prototype, 'get').andReturn(new Date(2016, 1, 1).getTime());
      spyOn(IonicStore.prototype, 'set');
      spyOn(IonicStore.prototype, 'save');
      var revertRequest = IonicCli.__set__('request', function(options, callback) {
        callback(null, null, '{ "version": "1.0.1" }');
      });

      IonicCli.checkLatestVersion('2.0.1').then(function() {
        expect(IonicStore.prototype.set).toHaveBeenCalledWith('versionCheck', jasmine.any(Number));
        expect(IonicStore.prototype.save).toHaveBeenCalled();
        revertRequest();
        done();
      });
    });
  });

  describe('printNewsUpdates method', function() {
    it('should log request info if a valid response is returned', function(done) {
      spyOn(log, 'info');
      var revertRequest = IonicCli.__set__('request', function(options, callback) {
        callback(null, { statusCode: '200' }, '{ "version": "1.0.1" }');
      });
      IonicCli.printNewsUpdates().then(function() {
        expect(log.info).toHaveBeenCalled();
        revertRequest();
        done();
      });
    });
  });

  describe('doRuntimeCheck method', function(done) {
    it('should update IonicConfig if semver is not met', function() {
      var version = '0.2.0';
      var error = new Error('semver failure');
      spyOn(IonicStore.prototype, 'get').andReturn('0.1.0');
      spyOn(IonicStore.prototype, 'set');
      spyOn(IonicStore.prototype, 'save');
      spyOn(semver, 'satisfies').andCallFake(function() {
        throw error;
      });

      IonicCli.doRuntimeCheck(version).then(function() {
        expect(IonicStore.prototype.set).toHaveBeenCalledWith('lastVersionChecked', version);
        expect(IonicStore.prototype.save).toHaveBeenCalled();
        done();
      });
    });

    it('should update IonicConfig if lastVersionChecked from IonicConfig is not available', function(done) {
      var version = '0.2.0';
      spyOn(IonicStore.prototype, 'get').andReturn(null);
      spyOn(IonicStore.prototype, 'set');
      spyOn(IonicStore.prototype, 'save');

      IonicCli.doRuntimeCheck(version).then(function() {
        expect(IonicStore.prototype.set).toHaveBeenCalledWith('lastVersionChecked', version);
        expect(IonicStore.prototype.save).toHaveBeenCalled();
        done();
      });
    });

    it('should not update IonicConfig if lastVersionChecked is available and semver is met', function(done) {
      var version = '0.2.0';
      spyOn(IonicStore.prototype, 'get').andReturn('0.2.0');
      spyOn(IonicStore.prototype, 'set');
      spyOn(IonicStore.prototype, 'save');
      spyOn(semver, 'satisfies').andReturn(true);

      IonicCli.doRuntimeCheck(version).then(function() {
        expect(IonicStore.prototype.set).not.toHaveBeenCalled();
        expect(IonicStore.prototype.save).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('getContentSrc method', function() {
    it('should call getContentSrc util for process cwd.', function() {
      spyOn(process, 'cwd').andReturn('/some/dir');
      spyOn(Utils, 'getContentSrc').andCallFake(function(param) {
        return param;
      });
      var result = IonicCli.getContentSrc();
      expect(process.cwd).toHaveBeenCalled();
      expect(Utils.getContentSrc).toHaveBeenCalledWith('/some/dir');
      expect(result).toEqual('/some/dir');
    });
  });

  describe('fail method', function() {
    it('should call fail util.', function() {
      IonicCli.fail('some error', 'task help text');
      expect(Utils.fail).toHaveBeenCalledWith('some error', 'task help text');
    });
  });

  describe('handleUncaughtExceptions method', function() {
    it('log an error and then exit if param is a string', function() {
      spyOn(log, 'error');
      spyOn(process, 'exit');
      spyOn(Utils, 'errorHandler');

      IonicCli.handleUncaughtExceptions('error message');
      expect(Utils.errorHandler).toHaveBeenCalledWith('error message');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('log an error and then exit if param is an object', function() {
      spyOn(log, 'error');
      spyOn(process, 'exit');
      spyOn(Utils, 'errorHandler');

      IonicCli.handleUncaughtExceptions({ message: 'error message' });
      expect(Utils.errorHandler).toHaveBeenCalledWith('error message');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
