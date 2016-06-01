'use strict';

var optimist = require('optimist');
var configTask = require('../../lib/ionic/config');
var IonicAppLib = require('ionic-app-lib');
var ioLib = IonicAppLib.ioConfig;
var IonicProject = IonicAppLib.project;
var appLibUtils = IonicAppLib.utils;

describe('config command', function() {

  describe('command settings', function() {

    it('should have a title', function() {
      expect(configTask.title).toBeDefined();
      expect(configTask.title).not.toBeNull();
      expect(configTask.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(configTask.summary).toBeDefined();
      expect(configTask.summary).not.toBeNull();
      expect(configTask.summary.length).toBeGreaterThan(0);
    });

    it('should have a boolean option of --nohooks or -n that defaults to true', function() {
      expect(configTask.args).toEqual(jasmine.any(Object));
      expect(configTask.args['<command>']).toEqual(jasmine.any(String));
      expect(configTask.args['[key]']).toEqual(jasmine.any(String));
      expect(configTask.args['[value]']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    it('should fail if the project cannot be loaded', function() {
      var processArguments = ['node', 'ionic', 'config', 'set'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load').andCallFake(function() {
        throw new Error('error happened');
      });
      spyOn(appLibUtils, 'fail');

      configTask.run({}, argv);
      expect(appLibUtils.fail).toHaveBeenCalledWith('error happened');
    });

    it('should fail if the command passed is not valid', function() {
      var processArguments = ['node', 'ionic', 'config', 'stuff'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(appLibUtils, 'fail');

      configTask.run({}, argv);
      expect(appLibUtils.fail).toHaveBeenCalledWith(jasmine.any(String));
    });

    it('should call ioLib.writeIoConfig if build command is passed', function() {
      var processArguments = ['node', 'ionic', 'config', 'build'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(ioLib, 'writeIoConfig');

      configTask.run({}, argv);
      expect(ioLib.writeIoConfig).toHaveBeenCalledWith(false, false, true);
    });

    it('should call ioLib.listConfig if info command is passed', function() {
      var processArguments = ['node', 'ionic', 'config', 'info'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(ioLib, 'listConfig');

      configTask.run({}, argv);
      expect(ioLib.listConfig).toHaveBeenCalled();
    });

    it('should fail if set is called without a key', function() {
      var processArguments = ['node', 'ionic', 'config', 'set'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(ioLib, 'writeIoConfig');
      spyOn(appLibUtils, 'fail');

      configTask.run({}, argv);
      expect(ioLib.writeIoConfig).not.toHaveBeenCalled();
      expect(appLibUtils.fail).toHaveBeenCalledWith(jasmine.any(String));
    });

    it('should call ioLib.writeIoConfig if unset command is used', function() {
      var processArguments = ['node', 'ionic', 'config', 'unset', 'red'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(ioLib, 'writeIoConfig');

      configTask.run({}, argv);
      expect(ioLib.writeIoConfig).toHaveBeenCalledWith('red', '', false);
    });

    it('should call ioLib.writeIoConfig if set command and pass empty string if no value is provided', function() {
      var processArguments = ['node', 'ionic', 'config', 'set', 'red'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(ioLib, 'writeIoConfig');

      configTask.run({}, argv);
      expect(ioLib.writeIoConfig).toHaveBeenCalledWith('red', '', true);
    });

    it('should call ioLib.writeIoConfig if set command', function() {
      var processArguments = ['node', 'ionic', 'config', 'set', 'red', 'yes'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(ioLib, 'writeIoConfig');

      configTask.run({}, argv);
      expect(ioLib.writeIoConfig).toHaveBeenCalledWith('red', 'yes', true);
    });
  });
});
