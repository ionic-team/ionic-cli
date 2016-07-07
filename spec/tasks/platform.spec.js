'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../lib/utils/cordova');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var IonicResources = IonicAppLib.resources;
var State = IonicAppLib.state;
var log = IonicAppLib.logging.logger;
var platform = require('../../lib/ionic/platform');

describe('platform command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
  });

  describe('command settings', function() {

    it('should have a title', function() {
      expect(platform.title).toBeDefined();
      expect(platform.title).not.toBeNull();
      expect(platform.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(platform.summary).toBeDefined();
      expect(platform.summary).not.toBeNull();
      expect(platform.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(platform.args).toEqual(jasmine.any(Object));
      expect(platform.args['[options]']).toEqual(jasmine.any(String));
      expect(platform.args['<PLATFORM>']).toEqual(jasmine.any(String));
    });

    it('should have options', function() {
      expect(platform.options).toEqual(jasmine.any(Object));
      expect(platform.options['--noresources|-r']).toEqual(jasmine.any(Object));
      expect(platform.options['--nosave|-e']).toEqual(jasmine.any(Object));
    });
  });

  describe('cordova command', function() {
    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').andReturn(appDirectory);
    });

    it('should fail if any functions throw', function(done) {
      var processArguments = ['node', 'ionic', 'platform', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('error occurred');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q.reject(error));

      platform.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should fail if any functions throw and not log if not an instance of an Error', function(done) {
      var processArguments = ['node', 'ionic', 'platform', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = 1;
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q.reject(error));

      platform.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).not.toHaveBeenCalled();
        done();
      });
    });

    it('should use commands provided', function(done) {
      var processArguments = ['node', 'ionic', 'platform', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      platform.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['platform', '-n']);
        done();
      });
    });

    it('should not save if no-save flag is provided', function(done) {
      var processArguments = ['node', 'ionic', 'platform', 'add', 'ios', '--nosave'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicResources, 'copyIconFilesIntoResources').andReturn(Q(true));
      spyOn(IonicResources, 'addIonicIcons').andReturn(Q(true));
      spyOn(State, 'savePlatform');
      spyOn(State, 'removePlatform');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      platform.run(null, argv, rawCliArguments).then(function() {
        expect(IonicResources.copyIconFilesIntoResources).toHaveBeenCalledWith(appDirectory);
        expect(IonicResources.addIonicIcons).toHaveBeenCalledWith(appDirectory, 'ios');
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['platform', 'add', 'ios', '--nosave']);
        expect(State.savePlatform).not.toHaveBeenCalled();
        expect(State.removePlatform).not.toHaveBeenCalled();
        done();
      });
    });

    it('should execute cordova using commands provided', function(done) {
      var processArguments = ['node', 'ionic', 'platform', 'add', 'ios'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicResources, 'copyIconFilesIntoResources').andReturn(Q(true));
      spyOn(IonicResources, 'addIonicIcons').andReturn(Q(true));
      spyOn(State, 'savePlatform');
      spyOn(State, 'removePlatform');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      platform.run(null, argv, rawCliArguments).then(function() {
        expect(IonicResources.copyIconFilesIntoResources).toHaveBeenCalledWith(appDirectory);
        expect(IonicResources.addIonicIcons).toHaveBeenCalledWith(appDirectory, 'ios');
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['platform', 'add', 'ios']);
        expect(State.savePlatform).toHaveBeenCalledWith(appDirectory, 'ios');
        expect(State.removePlatform).not.toHaveBeenCalled();
        done();
      });
    });

    it('should execute cordova using commands provided', function(done) {
      var processArguments = ['node', 'ionic', 'platform', 'remove', 'ios'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicResources, 'copyIconFilesIntoResources').andReturn(Q(true));
      spyOn(IonicResources, 'addIonicIcons').andReturn(Q(true));
      spyOn(State, 'savePlatform');
      spyOn(State, 'removePlatform');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      platform.run(null, argv, rawCliArguments).then(function() {
        expect(IonicResources.copyIconFilesIntoResources).not.toHaveBeenCalled();
        expect(IonicResources.addIonicIcons).not.toHaveBeenCalled();
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['platform', 'remove', 'ios']);
        expect(State.savePlatform).not.toHaveBeenCalled();
        expect(State.removePlatform).toHaveBeenCalledWith(appDirectory, 'ios');
        done();
      });
    });
  });
});
