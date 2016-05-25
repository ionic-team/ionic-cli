'use strict';

var Q = require('q');
var optimist = require('optimist');
var rewire = require('rewire');
var io = rewire('../../lib/ionic/io');
var IonicAppLib = require('ionic-app-lib');
var Login = IonicAppLib.login;
var IonicProject = IonicAppLib.project;
var appLibUtils = IonicAppLib.utils;
var ioLib = IonicAppLib.ioConfig;
var log = IonicAppLib.logging.logger;

// TODO: lets not do this
var LoginTask = require('../../lib/ionic/login');

describe('io command', function() {
  beforeEach(function() {
    spyOn(log, 'info');
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(io.title).toBeDefined();
      expect(io.title).not.toBeNull();
      expect(io.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(io.summary).toBeDefined();
      expect(io.summary).not.toBeNull();
      expect(io.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(io.args).toEqual(jasmine.any(Object));
      expect(io.args['<command>']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    var processArguments = ['node', 'ionic', 'io', 'init'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    it('should fail if ionic project fails to laod', function() {
      spyOn(appLibUtils, 'fail');
      spyOn(IonicProject, 'load').andCallFake(function() {
        throw new Error('oh broken');
      });
      io.run({}, argv);
      expect(appLibUtils.fail).toHaveBeenCalledWith('oh broken');
    });

    it('should fail if retrieveLogin returns a rejected promise', function(done) {
      var error = new Error('blah failed');
      spyOn(appLibUtils, 'fail');
      spyOn(IonicProject, 'load');
      spyOn(Login, 'retrieveLogin').andReturn(Q.reject(error));

      io.run({}, argv).then(function() {
        expect(Login.retrieveLogin).toHaveBeenCalled();
        expect(appLibUtils.fail).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should not call LoginTask if retrieveLogin returns a cookie jar', function(done) {
      spyOn(IonicProject, 'load');
      spyOn(Login, 'retrieveLogin').andReturn(Q(true));
      spyOn(LoginTask, 'login');
      spyOn(process, 'cwd').andReturn('/blah/dir/');
      spyOn(ioLib, 'initIoPlatform');

      io.run({}, argv).then(function() {
        expect(Login.retrieveLogin).toHaveBeenCalled();
        expect(LoginTask.login).not.toHaveBeenCalled();
        expect(ioLib.initIoPlatform).toHaveBeenCalledWith('/blah/dir/', true);
        done();
      });
    });

    it('should call LoginTask if retrieveLogin returns no cookie jar', function(done) {
      spyOn(IonicProject, 'load');
      spyOn(Login, 'retrieveLogin').andReturn(Q(null));
      spyOn(LoginTask, 'login').andReturn(Q(true));
      spyOn(process, 'cwd').andReturn('/blah/dir/');
      spyOn(ioLib, 'initIoPlatform');

      io.run({}, argv).then(function() {
        expect(Login.retrieveLogin).toHaveBeenCalled();
        expect(LoginTask.login).toHaveBeenCalledWith(argv);
        expect(ioLib.initIoPlatform).toHaveBeenCalledWith('/blah/dir/', true);
        done();
      });
    });

    it('should fail if command is not init', function(done) {
      processArguments = ['node', 'ionic', 'io', 'ini'];
      rawCliArguments = processArguments.slice(2);
      argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(Login, 'retrieveLogin').andReturn(Q(true));
      spyOn(ioLib, 'initIoPlatform');
      spyOn(appLibUtils, 'fail');

      io.run({}, argv).then(function() {
        expect(Login.retrieveLogin).toHaveBeenCalled();
        expect(appLibUtils.fail).toHaveBeenCalledWith('Invalid command');
        done();
      });
    });
  });
});
