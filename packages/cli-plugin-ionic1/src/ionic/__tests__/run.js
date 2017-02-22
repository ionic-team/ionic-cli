'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../utils/cordova');
var os = require('os');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var run = require('../run');
var npmScripts = require('../../utils/npmScripts');

describe('run command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').and.returnValue(Q(true));
  });

  describe('command settings', function() {

    it('should have a title', function() {
      expect(run.title).toBeDefined();
      expect(run.title).not.toBeNull();
      expect(run.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(run.summary).toBeDefined();
      expect(run.summary).not.toBeNull();
      expect(run.summary.length).toBeGreaterThan(0);
    });

    it('should have a boolean option of --nohooks or -n that defaults to true', function() {
      expect(run.options).toEqual(jasmine.any(Object));
      expect(run.options['--consolelogs|-c']).toEqual(jasmine.any(Object));
      expect(run.options['--consolelogs|-c'].boolean).toEqual(true);
      expect(run.options['--serverlogs|-s']).toEqual(jasmine.any(Object));
      expect(run.options['--serverlogs|-s'].boolean).toEqual(true);
      expect(run.options['--debug|--release']).toEqual(jasmine.any(Object));
      expect(run.options['--debug|--release'].boolean).toEqual(true);
    });
  });


  describe('cordova platform checks', function() {

    // This argv should model after optimist objects
    // $ ionic run -n
    var processArguments = ['node', 'ionic', 'run', '-n'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));
    });

    it('should default to iOS for the platform', function() {
      spyOn(os, 'platform').and.returnValue('darwin');

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.isPlatformInstalled).toHaveBeenCalledWith('ios', appDirectory);
      });
    });

    it('should fail if the system is not Mac and the platform is iOS', function() {
      spyOn(os, 'platform').and.returnValue('windows');

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith('✗ You cannot run iOS unless you are on Mac OSX.');
      });
    });
  });


  describe('cordova platform and plugin checks', function() {

    var appDirectory = '/ionic/app/path';
    var processArguments = ['node', 'ionic', 'run', '-n'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(os, 'platform').and.returnValue('darwin');

      spyOn(cordovaUtils, 'installPlatform').and.returnValue(Q(true));
      spyOn(cordovaUtils, 'installPlugins').and.returnValue(Q(true));
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));
    });

    it('should try to install the cordova platform if it is not installed', function() {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(false);

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).toHaveBeenCalledWith('ios');
      });
    });

    it('should not try to install the cordova platform if it is installed', function() {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).not.toHaveBeenCalledWith();
      });
    });

    it('should install plugins if they are not installed', function() {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(false);

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).toHaveBeenCalledWith();
      });
    });

    it('should not install plugins if they are installed', function() {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).not.toHaveBeenCalledWith();
      });
    });
  });

  describe('execute cordova command', function() {
    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(os, 'platform').and.returnValue('darwin');

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
    });

    it('should execute the command against the cordova util', function() {
      var processArguments = ['node', 'ionic', 'run', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', 'ios', '-n'], false, true);
      });
    });

    it('should fail if any functions throw', function() {
      var processArguments = ['node', 'ionic', 'run', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('error occurred');
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q.reject(error));

      return run.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
      });
    });

    it('should fail if any functions throw and not log if not an instance of an Error', function() {
      var processArguments = ['node', 'ionic', 'run', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = 1;
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q.reject(error));

      return run.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).not.toHaveBeenCalled();
      });
    });

    it('should execute the command against the cordova util using the platform provided', function() {
      var processArguments = ['node', 'ionic', 'run', 'android'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', 'android'], false, true);
      });
    });

    it('should execute the command against the cordova util using the platform provided', function() {
      var processArguments = ['node', 'ionic', 'run', 'android', '--livereload'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'setupLiveReload').and.returnValue(Q({
        blah: 'blah'
      }));
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.setupLiveReload).toHaveBeenCalledWith(argv, appDirectory);
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(
          ['run', 'android'], true, { blah: 'blah' });
      });
    });
  });

  describe('npmScripts check', function() {
    beforeEach(function() {
      var appDirectory = '/ionic/app/path';
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(os, 'platform').and.returnValue('darwin');

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));
    });

    it('should not call runIonicScript if hasIonicScript for build and serve are both false', function() {
      var processArguments = ['node', 'ionic', 'run', 'android'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(false);
        } else if (task === 'serve') {
          return Q(false);
        }
      });
      spyOn(npmScripts, 'runIonicScript');

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', 'android'], false, true);
      });
    });

    it('should call runIonicScript(build) if ' +
      'hasIonicScript(build) is true and hasIonicScript(build) is false', function() {
      var processArguments = ['node', 'ionic', 'run', 'android'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(true);
        } else if (task === 'serve') {
          return Q(false);
        }
      });
      spyOn(npmScripts, 'runIonicScript').and.returnValue(Q(true));

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.runIonicScript).toHaveBeenCalledWith('build', rawCliArguments.slice(2));
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', 'android'], false, true);
      });
    });

    it('should call runIonicScript(build) if ' +
      'hasIonicScript(build) is true and hasIonicScript(build) is true and liveReload is not passed', function() {
      var processArguments = ['node', 'ionic', 'run', 'android'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(true);
        } else if (task === 'serve') {
          return Q(true);
        }
      });
      spyOn(npmScripts, 'runIonicScript').and.returnValue(Q(true));

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.runIonicScript).toHaveBeenCalledWith('build', rawCliArguments.slice(2));
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', 'android'], false, true);
      });
    });

    it('should call runIonicScript(build) if ' +
      'hasIonicScript(build) is true and hasIonicScript(build) is true and liveReload is passed', function() {
      var processArguments = ['node', 'ionic', 'run', 'android', '--livereload'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(true);
        } else if (task === 'serve') {
          return Q(true);
        }
      });
      spyOn(cordovaUtils, 'startAppScriptsServer').and.returnValue(Q(true));

      return run.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.hasIonicScript.calls[0].args).toEqual(['build']);
        expect(npmScripts.hasIonicScript.calls[1].args).toEqual(['serve']);
        expect(cordovaUtils.startAppScriptsServer).toHaveBeenCalledWith(argv);
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', 'android'], true, true);
      });
    });
  });
});
