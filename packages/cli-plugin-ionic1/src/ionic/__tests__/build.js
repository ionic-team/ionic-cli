'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../utils/cordova');
var os = require('os');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var build = require('../build');
var npmScripts = require('../../utils/npmScripts');

describe('build command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').and.returnValue(Q(true));
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
      spyOn(process, 'cwd').and.returnValue(appDirectory);

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));
    });

    it('should default to iOS for the platform', function(done) {
      spyOn(os, 'platform').and.returnValue('darwin');

      // Expect failure
      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.isPlatformInstalled).toHaveBeenCalledWith('ios', appDirectory);
        done();
      });
    });

    it('should fail if the system is not Mac and the platform is iOS', function(done) {
      spyOn(os, 'platform').and.returnValue('windows');

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
      spyOn(os, 'platform').and.returnValue('darwin');
      spyOn(process, 'cwd').and.returnValue(appDirectory);

      spyOn(cordovaUtils, 'installPlatform').and.returnValue(Q(true));
      spyOn(cordovaUtils, 'installPlugins').and.returnValue(Q(true));
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
    });

    it('should try to install the cordova platform if it is not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(false);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).toHaveBeenCalledWith('ios');
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['build', 'ios', '-n']);
        done();
      });
    });

    it('should not try to install the cordova platform if it is installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).not.toHaveBeenCalledWith();
        done();
      });
    });

    it('should install plugins if they are not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(false);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).toHaveBeenCalledWith();
        done();
      });
    });

    it('should not install plugins if they are installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(0));

      build.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).not.toHaveBeenCalledWith();
        done();
      });
    });

    it('should fail if any functions throw', function(done) {
      var error = new Error('error occurred');
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q.reject(error));

      build.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should fail if any functions throw and not log if not an instance of an Error', function(done) {
      var error = 1;
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q.reject(error));

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
      spyOn(os, 'platform').and.returnValue('darwin');
      spyOn(process, 'cwd').and.returnValue(appDirectory);

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(0));
    });

    it('should not call runIonicScript if hasIonicScript is false', function(done) {
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
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
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(true));
      spyOn(npmScripts, 'runIonicScript').and.returnValue(Q(true));

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
