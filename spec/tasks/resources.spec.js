'use strict';

var Q = require('q');
var optimist = require('optimist');
var resources = require('../../lib/ionic/resources');
var IonicAppLib = require('ionic-app-lib');
var Project = IonicAppLib.project;
var appLibUtils = IonicAppLib.utils;
var IonicResources = IonicAppLib.resources;

describe('resources command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(resources.title).toBeDefined();
      expect(resources.title).not.toBeNull();
      expect(resources.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(resources.summary).toBeDefined();
      expect(resources.summary).not.toBeNull();
      expect(resources.summary.length).toBeGreaterThan(0);
    });

    it('should have options', function() {
      expect(resources.options).toEqual(jasmine.any(Object));
      expect(resources.options['--icon|-i']).toEqual(jasmine.any(Object));
      expect(resources.options['--splash|-s']).toEqual(jasmine.any(Object));
    });
  });

  describe('run function', function() {
    it('should fail if project cannot be loaded', function() {
      var processArguments = ['node', 'ionic', 'resources'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('an error occurred');
      spyOn(process, 'cwd').andReturn('/current/directory');
      spyOn(Project, 'load').andCallFake(function() {
        throw error;
      });
      spyOn(appLibUtils, 'fail');

      // Expect failure
      resources.run(null, argv, rawCliArguments);
      expect(appLibUtils.fail).toHaveBeenCalledWith(error, 'resources');
    });

    it('should fail if applib generate fails', function(done) {
      var processArguments = ['node', 'ionic', 'resources'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('an error occurred');
      spyOn(process, 'cwd').andReturn('/current/directory');
      spyOn(Project, 'load');
      spyOn(IonicResources, 'generate').andReturn(Q.reject(error));
      spyOn(appLibUtils, 'fail');

      // Expect failure
      resources.run(null, argv, rawCliArguments).then(function() {
        expect(appLibUtils.fail).toHaveBeenCalledWith(error, 'resources');
        done();
      });
    });

    it('should fail if applib generate fails and not log error if not instanceof Error', function(done) {
      var processArguments = ['node', 'ionic', 'resources'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = 'an error occurred';
      spyOn(process, 'cwd').andReturn('/current/directory');
      spyOn(Project, 'load');
      spyOn(IonicResources, 'generate').andReturn(Q.reject(error));
      spyOn(appLibUtils, 'fail');

      // Expect failure
      resources.run(null, argv, rawCliArguments).then(function() {
        expect(appLibUtils.fail).not.toHaveBeenCalled();
        done();
      });
    });

    it('should pass platforms on to the applib generate', function(done) {
      var processArguments = ['node', 'ionic', 'resources', '--icon'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(process, 'cwd').andReturn('/current/directory');
      spyOn(Project, 'load');
      spyOn(IonicResources, 'generate').andReturn(Q(true));
      spyOn(appLibUtils, 'fail');

      // Expect failure
      resources.run(null, argv, rawCliArguments).then(function() {
        expect(IonicResources.generate).toHaveBeenCalledWith('/current/directory', jasmine.any(Object));
        expect(appLibUtils.fail).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
