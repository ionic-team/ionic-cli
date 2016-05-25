'use strict';

var Q = require('q');
var optimist = require('optimist');
var rewire = require('rewire');
var upload = rewire('../../lib/ionic/upload');
var IonicAppLib = require('ionic-app-lib');
var Login = IonicAppLib.login;
var Upload = IonicAppLib.upload;
var appLibUtils = IonicAppLib.utils;
var log = IonicAppLib.logging.logger;

// TODO: lets not do this
var LoginTask = require('../../lib/ionic/login');

describe('upload command', function() {
  beforeEach(function() {
    spyOn(log, 'info');
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(upload.title).toBeDefined();
      expect(upload.title).not.toBeNull();
      expect(upload.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(upload.summary).toBeDefined();
      expect(upload.summary).not.toBeNull();
      expect(upload.summary.length).toBeGreaterThan(0);
    });

    it('should have options', function() {
      expect(upload.options).toEqual(jasmine.any(Object));
      expect(upload.options['--email|-e']).toEqual(jasmine.any(String));
      expect(upload.options['--password|-p']).toEqual(jasmine.any(String));
      expect(upload.options['--note']).toEqual(jasmine.any(String));
      expect(upload.options['--deploy <channel_tag>']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    it('should fail if ionic project fails to laod', function(done) {
      var processArguments = ['node', 'ionic', 'upload'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('oh broken');
      spyOn(appLibUtils, 'fail');
      spyOn(Login, 'retrieveLogin').andReturn(Q.reject(error));

      upload.run({}, argv).then(function() {
        expect(appLibUtils.fail).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should ask the user to login if we cannot retrieve a saved session', function(done) {
      var processArguments = ['node', 'ionic', 'upload', '--note', 'note text', '--deploy', 'dev'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var jar = {
        my: 'jar'
      };
      spyOn(process, 'cwd').andReturn('/my/pwd');
      spyOn(Login, 'retrieveLogin').andReturn(Q(false));
      spyOn(LoginTask, 'login').andReturn(Q(jar));
      spyOn(Upload, 'doUpload').andReturn(Q(true));

      upload.run({}, argv).then(function() {
        expect(Login.retrieveLogin).toHaveBeenCalled();
        expect(LoginTask.login).toHaveBeenCalledWith(argv);
        expect(Upload.doUpload).toHaveBeenCalledWith('/my/pwd', jar, 'note text', 'dev');
        done();
      });
    });

    it('should retrieve a saved session and use it', function(done) {
      var processArguments = ['node', 'ionic', 'upload', '--note', 'note text', '--deploy', 'dev'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var jar = {
        my: 'jar'
      };
      spyOn(process, 'cwd').andReturn('/my/pwd');
      spyOn(Login, 'retrieveLogin').andReturn(Q(jar));
      spyOn(Upload, 'doUpload').andReturn(Q(true));

      upload.run({}, argv).then(function() {
        expect(Login.retrieveLogin).toHaveBeenCalled();
        expect(Upload.doUpload).toHaveBeenCalledWith('/my/pwd', jar, 'note text', 'dev');
        done();
      });
    });
  });
});
