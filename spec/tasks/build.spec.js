'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../lib/utils/cordova');
var os = require('os');
var childProcess = require('child_process');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var build = require('../../lib/ionic/build');

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

    it('should have a boolean option of --nohooks or -n that defaults to true', function() {
      expect(build.options).toEqual(jasmine.any(Object));
      expect(build.options['--nohooks|-n']).toEqual(jasmine.any(Object));
    });
  });


  describe('cordova platform checks', function() {

    // This argv should model after optimist objects
    // $ ionic build -n
    var argv = {
      _: [
        'build'
      ],
      n: true,
      nohooks: false
    };
    var rawCliArguments = ['build', '-n'];
    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').andReturn(appDirectory);
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(childProcess, 'exec').andCallThrough();
    });

    it('should default to iOS for the platform', function(done) {
      spyOn(os, 'platform').andReturn('darwin');

      // Expect failure
      build.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.isPlatformInstalled).toHaveBeenCalledWith('ios', appDirectory);
        expect(childProcess.exec).toHaveBeenCalledWith('cordova build -n ios');
        done();
      });
    });

    it('should fail if the system is not Mac and the platform is iOS', function(done) {
      spyOn(os, 'platform').andReturn('windows');

      build.run(null, argv, rawCliArguments).catch(function(error) {
        expect(error).toEqual('✗ You cannot run iOS unless you are on Mac OSX.');
        done();
      });
    });
  });


  describe('cordova platform and plugin checks', function() {

    // This argv should model after optimist objects
    // $ ionic build -n
    var argv = {
      _: [
        'build'
      ],
      n: true,
      nohooks: false
    };
    var rawCliArguments = ['build', '-n'];
    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').andReturn(appDirectory);
      spyOn(os, 'platform').andReturn('darwin');
      spyOn(childProcess, 'exec').andCallThrough();

      spyOn(cordovaUtils, 'installPlatform').andReturn(Q(true));
      spyOn(cordovaUtils, 'installPlugins').andReturn(Q(true));
    });

    it('should try to install the cordova platform if it is not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(false);

      build.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.installPlatform).toHaveBeenCalledWith('ios');
        expect(childProcess.exec).toHaveBeenCalledWith('cordova build -n ios');
        done();
      });
    });

    it('should not try to install the cordova platform if it is installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);

      build.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.installPlatform).not.toHaveBeenCalledWith();
        done();
      });
    });

    it('should install plugins if they are not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(false);

      build.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).toHaveBeenCalledWith();
        done();
      });
    });

    it('should not install plugins if they are installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);

      build.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).not.toHaveBeenCalledWith();
        done();
      });
    });
  });

  describe('execute cordova command', function() {
    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').andReturn(appDirectory);
      spyOn(os, 'platform').andReturn('darwin');
      spyOn(childProcess, 'exec').andCallThrough();
    });

    it('should execute the command against the cordova util', function(done) {
      var processArguments = ['node', 'ionic', 'build', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);

      build.run(null, argv, rawCliArguments).catch(function() {
        expect(childProcess.exec).toHaveBeenCalledWith('cordova build -n ios');
        done();
      });
    });

    it('should execute the command against the cordova util using the platform provided', function(done) {
      var processArguments = ['node', 'ionic', 'build', 'android'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);

      build.run(null, argv, rawCliArguments).catch(function() {
        expect(childProcess.exec).toHaveBeenCalledWith('cordova build android');
        done();
      });
    });
  });
});
