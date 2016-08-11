'use strict';

var optimist = require('optimist');
var setup = require('../../lib/ionic/setup');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var appLibSetup = IonicAppLib.setup;
var log = IonicAppLib.logging.logger;
var Q = require('q');

describe('setup command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(setup.title).toBeDefined();
      expect(setup.title).not.toBeNull();
      expect(setup.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(setup.summary).toBeDefined();
      expect(setup.summary).not.toBeNull();
      expect(setup.summary.length).toBeGreaterThan(0);
    });

    it('should have a an option of sass', function() {
      expect(setup.args).toEqual(jasmine.any(Object));
      expect(setup.args['[sass]']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    it('should fail if a command is not passed', function(done) {
      var processArguments = ['node', 'ionic', 'setup'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(appLibUtils, 'fail');

      // Expect failure
      setup.run(null, argv, rawCliArguments).then(function() {
        expect(appLibUtils.fail).toHaveBeenCalledWith('Missing setup task command.', 'setup');
				done();
			});
    });

    it('should fail if a an invalid command passed', function(done) {
      var processArguments = ['node', 'ionic', 'setup', 'stuff'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(appLibUtils, 'fail');

      // Expect failure
      setup.run(null, argv, rawCliArguments).then(function() {
				expect(appLibUtils.fail).toHaveBeenCalledWith('Invalid setup task command: stuff', 'setup');
				done();
			});
    });

    it('should succeed if sass was passed and sassSetup returns success', function(done) {
      var processArguments = ['node', 'ionic', 'setup', 'sass'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;
      var dir = '/project/dir/path';

      spyOn(appLibUtils, 'fail');
      spyOn(log, 'info');
      spyOn(log, 'error');
      spyOn(process, 'cwd').andReturn(dir);
      spyOn(appLibSetup, 'sassSetup').andReturn(Q(true));

      // Expect success
      setup.run(null, argv, rawCliArguments).then(function() {
				expect(appLibSetup.sassSetup).toHaveBeenCalledWith(dir);
				expect(log.info).toHaveBeenCalled();
				expect(log.error).not.toHaveBeenCalled();
				done();
			});

    });

    it('should fail if sass was passed and sassSetup returns an error', function(done) {
      var processArguments = ['node', 'ionic', 'setup', 'sass'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;
      var dir = '/project/dir/path';

      spyOn(appLibUtils, 'fail');
      spyOn(log, 'info');
      spyOn(log, 'error');
      spyOn(process, 'cwd').andReturn(dir);
      spyOn(appLibSetup, 'sassSetup').andReturn(Q.reject('error occurred'));

      // Expect success
      setup.run(null, argv, rawCliArguments).then(function() {
				expect(appLibSetup.sassSetup).toHaveBeenCalledWith(dir);
				expect(log.info).not.toHaveBeenCalled();
				expect(log.error).toHaveBeenCalled();
				done();
			});
    });
  });
});
