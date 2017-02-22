'use strict';

var IonicAppLib = require('ionic-app-lib');
var optimist = require('optimist');
var Q = require('q');
var helpUtils = require('../utils/help');
var IonicStore = require('../utils/store');
var IonicStats = require('../utils/stats');
var Utils = IonicAppLib.utils;
var Project = IonicAppLib.project;
var Logging = IonicAppLib.logging;
var log = Logging.logger;
var fs = require('fs');
var path = require('path');
var rewire = require('rewire');
var IonicCli = rewire(require.resolve('../cli'));
var gulp = require('gulp');

describe('Cli', function() {

  beforeEach(function() {
    spyOn(IonicStats, 't');
    spyOn(helpUtils, 'printTaskListShortUsage');
    spyOn(helpUtils, 'printTaskListUsage');
    spyOn(IonicAppLib.events, 'on');
    spyOn(process, 'on');
    spyOn(Utils, 'cdIonicRoot');
    spyOn(Project, 'load');

    spyOn(Utils, 'fail').and.callFake(function(err) {
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
    });

    describe('#Cli methods', function() {

      it('should get the correct task by name', function() {
        var task = IonicCli.getTaskSettingsByName('start');
        expect(task).toBeDefined();
        expect(task.name).toBe('start');
        expect(task.args).toBeDefined();
      });

      it('should call attachErrorHandling', function() {
        spyOn(IonicCli, 'attachErrorHandling');

        return IonicCli.run(['node', 'bin/ionic'])
        .then(function() {
          expect(IonicCli.attachErrorHandling).toHaveBeenCalled();
        });
      });

      it('should get boolean options from start task', function() {
        var task = IonicCli.getTaskSettingsByName('start');
        var booleanOptions = IonicCli.getListOfBooleanOptions(task.options);

        // We expect 6 total = 3 options, each with short hand notation.
        expect(booleanOptions.length).toBe(9);
      });

      it('should track stats for cli', function() {

        return IonicCli.run(['node', 'bin/ionic', 'help'])
        .then(function() {
          expect(IonicStats.t).toHaveBeenCalled();
        });
      });

      it('should not track stats for cli for a bogus command', function() {

        return IonicCli.run(['node', 'bin/ionic', 'helper'])
        .then(function() {
          expect(IonicStats.t).not.toHaveBeenCalled();
        });
      });

      it('should change cwd to project root for project tasks', function() {
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
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(FakeTask, 'run').and.returnValue(Q(true));

        return IonicCli.run(processArguments)
        .then(function() {
          expect(Utils.cdIonicRoot).toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
        });
      });

      it('should skip loading gulpfile if node_modules does not exist', function() {
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
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(fs, 'existsSync').and.returnValue(false);
        spyOn(FakeTask, 'run').and.returnValue(Q(true));
        spyOn(IonicCli, 'loadGulpfile');
        spyOn(IonicCli, 'runWithGulp');

        return IonicCli.run(processArguments)
        .then(function() {
          expect(IonicCli.loadGulpfile).not.toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
        });
      });

      it('should skip runWithGulp if a gulpfile does not exist', function() {
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
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(IonicCli, 'loadGulpfile').and.returnValue(false);
        spyOn(FakeTask, 'run').and.returnValue(Q(true));
        spyOn(IonicCli, 'runWithGulp');

        return IonicCli.run(processArguments)
        .then(function() {
          expect(IonicCli.loadGulpfile).toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
        });
      });

      it('should not change cwd to project root for non project tasks', function() {
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
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(FakeTask, 'run').and.returnValue(Q(true));

        return IonicCli.run(processArguments)
        .then(function() {
          expect(Utils.cdIonicRoot).not.toHaveBeenCalled();
          expect(FakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);
        });
      });

      it('should print a warning if node_modules doesn\'t exist and using v2', function() {
        spyOn(fs, 'existsSync').and.returnValue(false);
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
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(IonicCli, 'runWithGulp');
        spyOn(log, 'warn');
        return IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(log.warn.calls[0].args[0]).toMatch(
            'WARN: No node_modules directory found, do you need to run npm install?'
          );
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
        });
      });

      it('should warn if cmd requires build step and gulpfile doesn\'t exist and using v2', function() {
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
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(FakeTask, 'run').and.returnValue(Q(true));
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(IonicCli, 'loadGulpfile').and.returnValue(false);
        spyOn(IonicCli, 'loadNpmScripts').and.returnValue(false);
        spyOn(log, 'warn');

        return IonicCli.run(['node', 'bin/ionic', 'build'])
        .then(function() {
          expect(log.warn).toHaveBeenCalledWith('WARN: No build file found!');
        });
      });

      it('should not runWithGulp if a gulpfile doesn\'t exist', function() {
        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {},
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(IonicCli, 'runWithGulp');
        spyOn(FakeTask, 'run').and.returnValue(Q(true));
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(IonicCli, 'loadGulpfile').and.returnValue(false);
        spyOn(IonicCli, 'loadNpmScripts').and.returnValue(false);

        return IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.loadGulpfile).toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
        });
      });

      it('should not runWithGulp if npmScripts exist', function() {
        var FakeTask = {
          name: 'fake',
          title: 'fake',
          run: function() {},
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(IonicCli, 'runWithGulp');
        spyOn(FakeTask, 'run').and.returnValue(Q(true));
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(IonicCli, 'loadGulpfile').and.returnValue(false);
        spyOn(IonicCli, 'loadNpmScripts').and.returnValue(true);

        return IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.loadGulpfile).toHaveBeenCalled();
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
        });
      });

      it('should runWithGulp', function() {
        var FakeTask = {
          name: 'fake',
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(IonicCli, 'runWithGulp').and.returnValue(Q(true));
        spyOn(IonicCli, 'runWithNpmScripts').and.returnValue(Q(true));
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(IonicCli, 'loadGulpfile').and.returnValue(true);
        spyOn(IonicCli, 'loadNpmScripts').and.returnValue({});

        return IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.runWithGulp).toHaveBeenCalled();
          expect(IonicCli.runWithNpmScripts).not.toHaveBeenCalled();
        });
      });

      it('should runWithNpmScripts without Gulpfile', function() {
        var FakeTask = {
          name: 'fake',
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(IonicCli, 'runWithGulp').and.returnValue(Q(true));
        spyOn(IonicCli, 'runWithNpmScripts').and.returnValue(Q(true));
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(IonicCli, 'loadGulpfile').and.returnValue(false);
        spyOn(IonicCli, 'loadNpmScripts').and.returnValue({
          'fake:before': true
        });

        return IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(IonicCli.runWithNpmScripts).toHaveBeenCalled();
        });
      });

      it('should runWithNpmScripts even with Gulpfile', function() {
        var FakeTask = {
          name: 'fake',
          isProjectTask: true
        };
        spyOn(IonicCli, 'getTaskSettingsByName').and.returnValue(FakeTask);
        spyOn(IonicCli, 'runWithGulp').and.returnValue(Q(true));
        spyOn(IonicCli, 'runWithNpmScripts').and.returnValue(Q(true));
        spyOn(fs, 'existsSync').and.returnValue(true);
        spyOn(IonicCli, 'loadGulpfile').and.returnValue(true);
        spyOn(IonicCli, 'loadNpmScripts').and.returnValue({
          'fake:before': true
        });

        return IonicCli.run(['node', 'bin/ionic', 'fake'])
        .then(function() {
          expect(IonicCli.runWithGulp).not.toHaveBeenCalled();
          expect(IonicCli.runWithNpmScripts).toHaveBeenCalled();
        });
      });

      it('should call Utils.fail if an exception occurrs within run', function() {
        var error = new Error('error happened');
        spyOn(IonicCli, 'checkLatestVersion').and.callFake(function() {
          return Q.reject(error);
        });

        return IonicCli.run(['node', 'bin/ionic', '--stats-opt-out']).fin(function() {
          expect(Utils.fail).toHaveBeenCalledWith(error);
        });
      });

      it('should save to the config if stats-opt-out is passed', function() {
        spyOn(IonicStore.prototype, 'set');
        spyOn(IonicStore.prototype, 'save');

        return IonicCli.run(['node', 'bin/ionic', '--stats-opt-out'])
        .then(function() {
          expect(IonicStore.prototype.set).toHaveBeenCalledWith('statsOptOut', true);
          expect(IonicStore.prototype.save).toHaveBeenCalled();
        });
      });
    });
  });

  describe('#commands options', function() {
    beforeEach(function() {
    });

    it('should parse start options correctly', function() {
      var Start = require('../ionic/start');
      spyOn(Start, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'start', 's1', '-w', '--appname', 'asdf'];

      return IonicCli.run(processArgs).then(function() {
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
      });
    });

    it('should parse serve options correctly', function() {
      var Serve = require('../ionic/serve');
      spyOn(Serve, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'serve', '--nogulp', '--all', '--browser', 'firefox'];

      return IonicCli.run(processArgs).then(function() {
        var taskArgs = Serve.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.browser).toBe('firefox');
        expect(taskArgv.nogulp).toBe(true);
        expect(taskArgv.all).toBe(true);
        expect(taskArgv.lab).toBe(false);
        expect(taskArgv.nobrowser).toBe(false);
      });
    });

    it('should parse upload options correctly', function() {
      var Upload = require('../ionic/upload');
      spyOn(Upload, 'run').and.returnValue(Q(true));

      var note = 'A note for notes';
      var processArgs = ['node', '/usr/local/bin/ionic', 'upload', '--email',
        'user@ionic.io', '--password', 'pass', '--note', note];

      return IonicCli.run(processArgs).then(function() {
        var taskArgs = Upload.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.note).toBe(note);
        expect(taskArgv.email).toBe('user@ionic.io');
        expect(taskArgv.password).toBe('pass');
      });
    });

    it('should parse login options correctly', function() {
      var Login = require('../ionic/login');
      spyOn(Login, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'login', '--email', 'user@ionic.io', '--password', 'pass'];

      return IonicCli.run(processArgs).then(function() {
        var taskArgs = Login.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(1);
        expect(taskArgv.email).toBe('user@ionic.io');
        expect(taskArgv.password).toBe('pass');
      });
    });

    it('should parse run options correctly', function() {
      var Run = require('../ionic/run');
      spyOn(Run, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'run', 'ios', '--livereload',
        '--port', '5000', '-r', '35730', '--consolelogs', '--serverlogs', '--device'];

      return IonicCli.run(processArgs).then(function() {
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
      });
    });

    it('should parse emulate options correctly', function() {
      var Emulate = require('../ionic/emulate');
      spyOn(Emulate, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'emulate', 'android',
        '--livereload', '--address', 'localhost', '--port', '5000', '-r', '35730', '--consolelogs', '--serverlogs'];

      return IonicCli.run(processArgs).then(function() {
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
      });
    });

    it('should parse state options correctly', function() {
      var State = require('../ionic/state');
      spyOn(State, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'state', 'save', '--plugins'];

      return IonicCli.run(processArgs).then(function() {
        var taskArgs = State.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[1]).toBe('save');
        expect(taskArgv.plugins).toBe(true);
        expect(taskArgv.platforms).toBe(false);
      });
    });

    it('should parse plugin options correctly', function() {
      var Plugin = require('../ionic/plugin');
      spyOn(Plugin, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'plugin', 'add',
        'org.apache.cordova.splashscreen', '--nosave', '--searchpath', '../'];

      return IonicCli.run(processArgs).then(function() {
        var taskArgs = Plugin.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(3);
        expect(taskArgv._[0]).toBe('plugin');
        expect(taskArgv._[1]).toBe('add');
        expect(taskArgv._[2]).toBe('org.apache.cordova.splashscreen');
        expect(taskArgv.nosave).toBe(true);
        expect(taskArgv.searchpath).toBe('../');
      });
    });

    it('should parse build options correctly', function() {
      var Build = require('../ionic/build');
      spyOn(Build, 'run').and.returnValue(Q(true));

      var processArgs = ['node', '/usr/local/bin/ionic', 'build', 'ios', '--nohooks'];

      return IonicCli.run(processArgs).then(function() {
        var taskArgs = Build.run.mostRecentCall.args;

        var taskArgv = taskArgs[1];

        // should only have serve in the command args
        expect(taskArgv._.length).toBe(2);
        expect(taskArgv._[0]).toBe('build');
        expect(taskArgv._[1]).toBe('ios');
        expect(taskArgv.nohooks).toBe(true);
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
      spyOn(gulp, 'start').and.callThrough();
      spyOn(IonicCli, 'loadGulpfile').and.returnValue(true);
      spyOn(fakeTask, 'run').and.callThrough();
      spyOn(process, 'exit').and.returnValue(true);
      spyOn(IonicCli, 'logEvents');
      spyOn(log, 'error');
      spyOn(fs, 'existsSync');
    });

    it('should try to load gulp, exit if it fails', function() {
      spyOn(path, 'resolve').and.returnValue('./wrong_path');

      return IonicCli.runWithGulp(argv, fakeTask, rawCliArguments).catch(function() {
        expect(log.error).toHaveBeenCalledWith('\nGulpfile detected, but gulp is not installed'.red);
        expect(log.error).toHaveBeenCalledWith('Do you need to run `npm install`?\n'.red);
        expect(process.exit).toHaveBeenCalled();

        expect(IonicCli.logEvents).not.toHaveBeenCalled();
        expect(fakeTask.run).not.toHaveBeenCalled();
        expect(gulp.start).not.toHaveBeenCalled();
      });
    });


    it('should run logEvents, the command and the gulp hooks', function() {
      return IonicCli.runWithGulp(argv, fakeTask, rawCliArguments).then(function() {

        expect(IonicCli.logEvents).toHaveBeenCalled();
        expect(gulp.start).toHaveBeenCalledWith('fake:before', qCallbacks[0]);
        expect(gulp.start).toHaveBeenCalledWith('fake:after', qCallbacks[1]);
        expect(fakeTask.run).toHaveBeenCalledWith(IonicCli, argv, rawCliArguments);

        expect(log.error).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
        expect(fs.existsSync).not.toHaveBeenCalled();
      });
    });

    it('should warn if no gulp task and using v2 and cmd requires build', function() {
      argv._[0] = 'build';
      spyOn(log, 'warn');
      gulp.start = function(taskName, cb) {
        cb({
          missingTask: true
        });
      };
      return IonicCli.runWithGulp(argv, fakeTask).then(function() {
        expect(log.warn).toHaveBeenCalledWith(('WARN: No \'build:before\' gulp task found!').yellow);
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

  describe('getContentSrc method', function() {
    it('should call getContentSrc util for process cwd.', function() {
      spyOn(process, 'cwd').and.returnValue('/some/dir');
      spyOn(Utils, 'getContentSrc').and.callFake(function(param) {
        return param;
      });
      var result = IonicCli.getContentSrc();
      expect(process.cwd).toHaveBeenCalled();
      expect(Utils.getContentSrc).toHaveBeenCalledWith('/some/dir');
      expect(result).toEqual('/some/dir');
    });
  });
});
