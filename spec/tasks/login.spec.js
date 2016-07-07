'use strict';

var Q = require('q');
var optimist = require('optimist');
var prompt = require('prompt');
var rewire = require('rewire');
var login = rewire('../../lib/ionic/login');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var appLibLogin = IonicAppLib.login;

describe('login command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(login.title).toBeDefined();
      expect(login.title).not.toBeNull();
      expect(login.title.length).toBeGreaterThan(0);
    });
  });

  describe('run function', function() {
    it('should call the login function', function() {
      var processArguments = ['node', 'ionic', 'login'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var loginSpy = jasmine.createSpy('loginSpy');
      var revertLoginSpy = login.__set__('login', loginSpy);

      // Expect failure
      login.run(null, argv);
      expect(loginSpy).toHaveBeenCalledWith(argv);
      revertLoginSpy();
    });
  });

  describe('login function', function() {
    it('should use argv email and password first.', function(done) {
      var processArguments = ['node', 'ionic', 'login', '--email', 'josh@ionic.io', '--password', 'asdf1234'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var jar = { jar: 'contents' };
      spyOn(log, 'info');
      spyOn(login, 'promptForLogin');
      spyOn(appLibLogin, 'requestLogIn').andReturn(Q(jar));

      login.login(argv).then(function(results) {
        expect(results).toEqual(jar);
        expect(login.promptForLogin).not.toHaveBeenCalled();
        expect(appLibLogin.requestLogIn).toHaveBeenCalledWith('josh@ionic.io', 'asdf1234', true);
        done();
      });
    });

    it('should use argv e and p second.', function(done) {
      var processArguments = ['node', 'ionic', 'login', '--e', 'josh@ionic.io', '--p', 'asdf1234'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var jar = { jar: 'contents' };
      spyOn(log, 'info');
      spyOn(login, 'promptForLogin');
      spyOn(appLibLogin, 'requestLogIn').andReturn(Q(jar));

      login.login(argv).then(function(results) {
        expect(results).toEqual(jar);
        expect(login.promptForLogin).not.toHaveBeenCalled();
        expect(appLibLogin.requestLogIn).toHaveBeenCalledWith('josh@ionic.io', 'asdf1234', true);
        done();
      });
    });

    it('should use environment variables last.', function(done) {
      var processArguments = ['node', 'ionic', 'login'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      process.env.IONIC_EMAIL = 'josh@ionic.io';
      process.env.IONIC_PASSWORD = 'asdf1234';
      var jar = { jar: 'contents' };
      spyOn(log, 'info');
      spyOn(login, 'promptForLogin');
      spyOn(appLibLogin, 'requestLogIn').andReturn(Q(jar));

      login.login(argv).then(function(results) {
        expect(results).toEqual(jar);
        expect(login.promptForLogin).not.toHaveBeenCalled();
        expect(appLibLogin.requestLogIn).toHaveBeenCalledWith('josh@ionic.io', 'asdf1234', true);
        done();
      });
      delete process.env.IONIC_EMAIL;
      delete process.env.IONIC_PASSWORD;
    });

    it('should prompt to ask for email and password when not available', function(done) {
      var processArguments = ['node', 'ionic', 'login'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var jar = { jar: 'contents' };
      spyOn(log, 'info');

      var promptForLoginSpy = jasmine.createSpy('promptForLoginSpy');
      promptForLoginSpy.andReturn(Q({
        email: 'josh@ionic.io',
        password: 'asdf1234'
      }));
      var revertPromptForLoginSpy = login.__set__('promptForLogin', promptForLoginSpy);
      spyOn(appLibLogin, 'requestLogIn').andReturn(Q(jar));

      login.login(argv).then(function(results) {
        expect(results).toEqual(jar);
        expect(promptForLoginSpy).toHaveBeenCalledWith(argv);
        expect(appLibLogin.requestLogIn).toHaveBeenCalledWith('josh@ionic.io', 'asdf1234', true);
        revertPromptForLoginSpy();
        done();
      });
    });

    it('should display the error on a failed log in attempt', function(done) {
      var processArguments = ['node', 'ionic', 'login', '--email', 'josh@ionic.io', '--password', 'asdf1234'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = 'Email or Password incorrect. Please visit';
      spyOn(log, 'error');
      spyOn(login, 'promptForLogin');
      spyOn(appLibLogin, 'requestLogIn').andReturn(Q.reject(error));

      login.login(argv).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
        done();
      });
    });
  });

  describe('promptForLogin function', function() {
    it('should ask for email and password and return a promise', function(done) {
      var processArguments = ['node', 'ionic', 'login'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(log, 'info');
      spyOn(prompt, 'start');
      spyOn(prompt, 'get').andCallFake(function(schema, callback) {
        callback(null, { email: 'josh@ionic.io', password: 'asdf1234' });
      });

      var promptForLogin = login.__get__('promptForLogin');

      promptForLogin(argv).then(function(results) {
        expect(prompt.get).toHaveBeenCalled();
        expect(results.email).toEqual('josh@ionic.io');
        expect(results.password).toEqual('asdf1234');
        done();
      });
    });

    it('should ask for email and password and eject an error if error', function(done) {
      var processArguments = ['node', 'ionic', 'login'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;
      var error = 'error logging in';

      spyOn(log, 'info');
      spyOn(prompt, 'start');
      spyOn(prompt, 'get').andCallFake(function(schema, callback) {
        callback(error);
      });

      var promptForLogin = login.__get__('promptForLogin');

      promptForLogin(argv).catch(function(error) {
        expect(prompt.get).toHaveBeenCalled();
        expect(error).toEqual(error);
        done();
      });
    });
  });
});
