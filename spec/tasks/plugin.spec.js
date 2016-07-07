'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../lib/utils/cordova');
var IonicAppLib = require('ionic-app-lib');
var State = IonicAppLib.state;
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var plugin = require('../../lib/ionic/plugin');

describe('plugin command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
  });

  describe('command settings', function() {

    it('should have a title', function() {
      expect(plugin.title).toBeDefined();
      expect(plugin.title).not.toBeNull();
      expect(plugin.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(plugin.summary).toBeDefined();
      expect(plugin.summary).not.toBeNull();
      expect(plugin.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(plugin.args).toEqual(jasmine.any(Object));
      expect(plugin.args['[options]']).toEqual(jasmine.any(String));
      expect(plugin.args['<SPEC>']).toEqual(jasmine.any(String));
    });

    it('should have a boolean option of --nohooks or -n that defaults to true', function() {
      expect(plugin.options).toEqual(jasmine.any(Object));
      expect(plugin.options['--searchpath <directory>']).toEqual(jasmine.any(String));
      expect(plugin.options['--nosave|-e']).toEqual(jasmine.any(Object));
    });
  });


  describe('cordova platform checks', function() {

    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').andReturn(appDirectory);
      spyOn(log, 'info');
    });

    it('should pass args on to cordovaUtils', function(done) {
      var processArguments = ['node', 'ionic', 'plugin', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      plugin.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['plugin', '-n']);
        done();
      });
    });

    it('should fail if any functions throw', function(done) {
      var processArguments = ['node', 'ionic', 'plugin', 'add', 'thing', '--variable', 'hello'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('error occurred');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q.reject(error));

      plugin.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should fail if any functions throw and not log if not an instance of an Error', function(done) {
      var processArguments = ['node', 'ionic', 'plugin', 'add', 'thing', '--variable', 'hello'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = 1;
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q.reject(error));

      plugin.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).not.toHaveBeenCalled();
        done();
      });
    });

    it('should not save if nosave flag is passed', function(done) {
      var processArguments = ['node', 'ionic', 'plugin', 'add', 'thing', '--variable', 'hello', '--nosave'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(State, 'savePlugin');
      spyOn(State, 'removePlugin');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      plugin.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(
          ['plugin', 'add', 'thing', '--variable', 'hello', '--nosave']);
        expect(State.savePlugin).not.toHaveBeenCalled();
        expect(State.removePlugin).not.toHaveBeenCalled();
        done();
      });
    });

    it('should add array of variables', function(done) {
      var processArguments = ['node', 'ionic', 'plugin', 'add', 'thing', '--variable', 'hello', '--variable', 'man'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(State, 'savePlugin');
      spyOn(State, 'removePlugin');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      plugin.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(
          ['plugin', 'add', 'thing', '--variable', 'hello', '--variable', 'man']);
        expect(State.savePlugin).toHaveBeenCalledWith(appDirectory, 'thing', ['hello', 'man']);
        expect(State.removePlugin).not.toHaveBeenCalled();
        done();
      });
    });

    it('should add plugins', function(done) {
      var processArguments = ['node', 'ionic', 'plugin', 'add', 'thing', '--variable', 'hello'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(State, 'savePlugin');
      spyOn(State, 'removePlugin');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      plugin.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['plugin', 'add', 'thing', '--variable', 'hello']);
        expect(State.savePlugin).toHaveBeenCalledWith(appDirectory, 'thing', ['hello']);
        expect(State.removePlugin).not.toHaveBeenCalled();
        done();
      });
    });

    it('should remove plugins', function(done) {
      var processArguments = ['node', 'ionic', 'plugin', 'remove', 'thing'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(State, 'savePlugin');
      spyOn(State, 'removePlugin');
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(0));

      plugin.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['plugin', 'remove', 'thing']);
        expect(State.removePlugin).toHaveBeenCalledWith(appDirectory, 'thing');
        expect(State.savePlugin).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
