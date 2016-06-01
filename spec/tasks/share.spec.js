'use strict';

var Q = require('q');
var optimist = require('optimist');
var share = require('../../lib/ionic/share');
var IonicAppLib = require('ionic-app-lib');
var Project = IonicAppLib.project;
var Share = IonicAppLib.share;
var log = IonicAppLib.logging.logger;
var Login = IonicAppLib.login;
var appLibUtils = IonicAppLib.utils;

var LoginTask = require('../../lib/ionic/login');

describe('share command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(share.title).toBeDefined();
      expect(share.title).not.toBeNull();
      expect(share.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(share.summary).toBeDefined();
      expect(share.summary).not.toBeNull();
      expect(share.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(share.args).toEqual(jasmine.any(Object));
      expect(share.args['<EMAIL>']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    it('should fail email is missing', function() {
      var processArguments = ['node', 'ionic', 'share'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(appLibUtils, 'fail');

      // Expect failure
      share.run(null, argv, rawCliArguments);
      expect(appLibUtils.fail).toHaveBeenCalledWith('Invalid command', 'share');
    });

    it('should fail if project.load fails', function() {
      var processArguments = ['node', 'ionic', 'share', 'josh@ionic.io'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('an error occurred');
      spyOn(Project, 'load').andCallFake(function() {
        throw error;
      });
      spyOn(appLibUtils, 'fail');

      // Expect failure
      share.run(null, argv, rawCliArguments);
      expect(appLibUtils.fail).toHaveBeenCalledWith(error.message);
    });

    it('should fail if the project does not have an app_id', function() {
      var processArguments = ['node', 'ionic', 'share', 'josh@ionic.io'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var projectSpy = jasmine.createSpyObj('promiseExec', ['get']);
      spyOn(Project, 'load').andReturn(projectSpy);
      projectSpy.get.andReturn('');
      spyOn(appLibUtils, 'fail');

      // Expect failure
      share.run(null, argv, rawCliArguments);
      expect(appLibUtils.fail).toHaveBeenCalledWith('You must first upload the app to share it');
    });

    it('should fail if the email provided does not have an @ sign within it', function() {
      var processArguments = ['node', 'ionic', 'share', 'joshionic.io'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var projectSpy = jasmine.createSpyObj('promiseExec', ['get']);
      spyOn(Project, 'load').andReturn(projectSpy);
      projectSpy.get.andReturn('123');
      spyOn(appLibUtils, 'fail');

      // Expect failure
      share.run(null, argv, rawCliArguments);
      expect(appLibUtils.fail).toHaveBeenCalledWith('Invalid email address', 'share');
    });

    it('should fail if the login.retrieveLogin returns a rejected promise', function(done) {
      var processArguments = ['node', 'ionic', 'share', 'josh@ionic.io'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(log, 'info');
      var projectSpy = jasmine.createSpyObj('promiseExec', ['get']);
      spyOn(Project, 'load').andReturn(projectSpy);
      projectSpy.get.andReturn('123');
      spyOn(Login, 'retrieveLogin').andReturn(Q.reject('error occurred'));
      spyOn(appLibUtils, 'fail').andReturn(Q(true)); // TODO: hack for now

      // Expect failure
      share.run(null, argv, rawCliArguments).then(function() {
        expect(appLibUtils.fail).toHaveBeenCalledWith('error occurred');
        done();
      });
    });

    it('should not ask a user to login if a previous session is found', function(done) {
      var processArguments = ['node', 'ionic', 'share', 'josh@ionic.io'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(log, 'info');
      spyOn(process, 'cwd').andReturn('/stuff/things');
      var projectSpy = jasmine.createSpyObj('promiseExec', ['get']);
      spyOn(Project, 'load').andReturn(projectSpy);
      projectSpy.get.andReturn('123');
      spyOn(Login, 'retrieveLogin').andReturn(Q({ jar: 'contents' }));
      spyOn(LoginTask, 'login');
      spyOn(Share, 'shareApp').andReturn(Q(true));

      // Expect failure
      share.run(null, argv, rawCliArguments).then(function() {
        expect(LoginTask.login).not.toHaveBeenCalled();
        expect(Share.shareApp).toHaveBeenCalledWith(
          '/stuff/things', { jar: 'contents' }, 'josh@ionic.io'
        );
        done();
      });
    });

    it('should ask a user to login if a previous session is not found', function(done) {
      var processArguments = ['node', 'ionic', 'share', 'josh@ionic.io'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(log, 'info');
      spyOn(process, 'cwd').andReturn('/stuff/things');
      var projectSpy = jasmine.createSpyObj('promiseExec', ['get']);
      spyOn(Project, 'load').andReturn(projectSpy);
      projectSpy.get.andReturn('123');
      spyOn(Login, 'retrieveLogin').andReturn(Q(false));
      spyOn(LoginTask, 'login').andReturn(Q({ jar: 'contents' }));
      spyOn(Share, 'shareApp').andReturn(Q(true));

      // Expect failure
      share.run(null, argv, rawCliArguments).then(function() {
        expect(LoginTask.login).toHaveBeenCalledWith(argv);
        expect(Share.shareApp).toHaveBeenCalledWith(
          '/stuff/things', { jar: 'contents' }, 'josh@ionic.io'
        );
        done();
      });
    });
  });
});
