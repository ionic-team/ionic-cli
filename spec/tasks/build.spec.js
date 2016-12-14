'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../lib/utils/cordova');
var os = require('os');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var build = require('../../lib/ionic/build');
var npmScripts = require('../../lib/utils/npmScripts');

describe('build command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
  });

  describe('command settings', function() {

    it('should have a title', function() {
      expect(build.title).toBeDefined();
      expect(build.title).not.toBeNull();
      expect(build.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(build.summary).toBeDefined();
      expect(build.summary).not.toBeNull();
      expect(build.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(build.args).toEqual(jasmine.any(Object));
      expect(build.args['[options]']).toEqual(jasmine.any(String));
      expect(build.args['<PLATFORM>']).toEqual(jasmine.any(String));
    });

    it('should have options', function() {
      expect(build.options).toEqual(jasmine.any(Object));
      expect(build.options['--nohooks|-n']).toEqual(jasmine.any(Object));
    });
  });


  describe('cordova platform checks', function() {

    var appDirectory = '/ionic/app/path';
    var processArguments = ['node', 'ionic', 'build', '-n'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(process, 'cwd').andReturn(appDirectory);

      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(true));
    });

    it('should default to iOS for the platform', function(done) {
      spyOn(os, 'platform').andReturn('darwin');

      // Expect failure
      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.isPlatformInstalled).toHaveBeenCalledWith('ios', appDirectory);
        done();
      });
    });

    it('should fail if the system is not Mac and the platform is iOS', function(done) {
      spyOn(os, 'platform').andReturn('windows');

      build.run(null, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith('✗ You cannot run iOS unless you are on Mac OSX.');
        done();
      });
    });
  });

  describe('cordova platform and plugin checks', function() {

    var appDirectory = '/ionic/app/path';
    var processArguments = ['node', 'ionic', 'build', 'ios', '-n'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(os, 'platform').andReturn('darwin');
      spyOn(process, 'cwd').andReturn(appDirectory);

      spyOn(cordovaUtils, 'installPlatform').andReturn(Q(true));
      spyOn(cordovaUtils, 'installPlugins').andReturn(Q(true));
      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
    });

    it('should try to install the cordova platform if it is not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(false);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).toHaveBeenCalledWith('ios');
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['build', 'ios', '-n']);
        done();
      });
    });

    it('should not try to install the cordova platform if it is installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).not.toHaveBeenCalledWith();
        done();
      });
    });

    it('should install plugins if they are not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(false);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).toHaveBeenCalledWith();
        done();
      });
    });

    it('should not install plugins if they are installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).not.toHaveBeenCalledWith();
        done();
      });
    });

    it('should fail if any functions throw', function(done) {
      var error = new Error('error occurred');
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q.reject(error));

      build.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should fail if any functions throw and not log if not an instance of an Error', function(done) {
      var error = 1;
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q.reject(error));

      build.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('npmScripts check', function() {
    var appDirectory = '/ionic/app/path';
    var processArguments = ['node', 'ionic', 'build', 'ios', '-n'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(os, 'platform').andReturn('darwin');
      spyOn(process, 'cwd').andReturn(appDirectory);

      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));
    });

    it('should not call runIonicScript if hasIonicScript is false', function(done) {
      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');

      build.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.hasIonicScript).toHaveBeenCalledWith('build');
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['build', 'ios', '-n']);
        done();
      }).catch(function(e) {
        console.log(e);
      });
    });

    it('should call runIonicScript if hasIonicScript is true', function(done) {
      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(true));
      spyOn(npmScripts, 'runIonicScript').andReturn(Q(true));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.hasIonicScript).toHaveBeenCalledWith('build');
        expect(npmScripts.runIonicScript).toHaveBeenCalledWith('build', rawCliArguments.slice(2));
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['build', 'ios', '-n']);
        done();
      }).catch(function(e) {
        console.log(e);
      });
    });
  });
});
