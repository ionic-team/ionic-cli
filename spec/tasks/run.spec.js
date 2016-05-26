'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../lib/utils/cordova');
var os = require('os');
var childProcess = require('child_process');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var run = require('../../lib/ionic/run');

describe('run command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
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
      spyOn(process, 'cwd').andReturn(appDirectory);
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
    });

    it('should default to iOS for the platform', function(done) {
      spyOn(os, 'platform').andReturn('darwin');

      run.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.isPlatformInstalled).toHaveBeenCalledWith('ios', appDirectory);
        done();
      });
    });

    it('should fail if the system is not Mac and the platform is iOS', function(done) {
      spyOn(os, 'platform').andReturn('windows');

      run.run(null, argv, rawCliArguments).catch(function(error) {
        expect(error).toEqual('✗ You cannot run iOS unless you are on Mac OSX.');
        done();
      });
    });
  });


  describe('cordova platform and plugin checks', function() {

    // This argv should model after optimist objects
    // $ ionic run -n
    var argv = {
      _: [
        'run'
      ],
      n: true,
      nohooks: false
    };
    var rawCliArguments = ['run', '-n'];
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

      run.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.installPlatform).toHaveBeenCalledWith('ios');
        expect(childProcess.exec).toHaveBeenCalledWith('cordova run -n ios');
        done();
      });
    });

    it('should not try to install the cordova platform if it is installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);

      run.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.installPlatform).not.toHaveBeenCalledWith();
        done();
      });
    });

    it('should install plugins if they are not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(false);

      run.run(null, argv, rawCliArguments).catch(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).toHaveBeenCalledWith();
        done();
      });
    });

    it('should not install plugins if they are installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);

      run.run(null, argv, rawCliArguments).catch(function() {
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
    });

    it('should execute the command against the cordova util', function(done) {
      var processArguments = ['node', 'ionic', 'run', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(true));

      run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', '-n', 'ios'], false, true);
        done();
      });
    });


    it('should execute the command against the cordova util using the platform provided', function(done) {
      var processArguments = ['node', 'ionic', 'run', 'android'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(true));

      run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['run', 'android'], false, true);
        done();
      });
    });

    it('should execute the command against the cordova util using the platform provided', function(done) {
      var processArguments = ['node', 'ionic', 'run', 'android', '--livereload'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
      spyOn(cordovaUtils, 'setupLiveReload').andReturn(Q({
        blah: 'blah'
      }));
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(true));

      run.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.setupLiveReload).toHaveBeenCalledWith(argv);
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(
          ['run', 'android'], true, { blah: 'blah' });
        done();
      });
    });
  });
});
