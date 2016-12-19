'use strict';

var fs = require('fs');
var Q = require('q');
var optimist = require('optimist');
var rewire = require('rewire');
var start = rewire('../../lib/ionic/start');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var Start = IonicAppLib.start;
var log = IonicAppLib.logging.logger;
var templateUtils = require('../../lib/utils/templates');

describe('start command', function() {
  beforeEach(function() {
    spyOn(log, 'info');
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(start.title).toBeDefined();
      expect(start.title).not.toBeNull();
      expect(start.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(start.summary).toBeDefined();
      expect(start.summary).not.toBeNull();
      expect(start.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(start.args).toEqual(jasmine.any(Object));
      expect(start.args['[options]']).toEqual(jasmine.any(String));
      expect(start.args['<PATH>']).toEqual(jasmine.any(String));
      expect(start.args['[template]']).toEqual(jasmine.any(String));
    });

    it('should have options', function() {
      expect(start.options).toEqual(jasmine.any(Object));
      expect(start.options['--appname|-a']).toEqual(jasmine.any(String));
      expect(start.options['--id|-i']).toEqual(jasmine.any(String));
      expect(start.options['--skip-npm']).toEqual(jasmine.any(Object));
      expect(start.options['--no-cordova|-w']).toEqual(jasmine.any(Object));
      expect(start.options['--sass|-s']).toEqual(jasmine.any(Object));
      expect(start.options['--list|-l']).toEqual(jasmine.any(Object));
      expect(start.options['--io-app-id']).toEqual(jasmine.any(String));
      expect(start.options['--template|-t']).toEqual(jasmine.any(String));
      expect(start.options['--v2|-v']).toEqual(jasmine.any(Object));
      expect(start.options['--zip-file|-z']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {

    it('should call list and return templates when list is passed as a command', function() {
      var processArguments = ['node', 'ionic', 'start', '--list'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(templateUtils, 'listTemplates');
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();

      start.run({}, argv);
      expect(templateUtils.listTemplates).toHaveBeenCalled();
      expect(appLibUtils.preprocessCliOptions).not.toHaveBeenCalled();
    });

    it('should fail if a dir is not supplied to start', function() {
      var processArguments = ['node', 'ionic', 'start'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(appLibUtils, 'fail');
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();

      start.run({}, argv);
      expect(appLibUtils.fail).toHaveBeenCalled();
      expect(appLibUtils.preprocessCliOptions).not.toHaveBeenCalled();
    });

    it('should fail if a the dir is equal to "."', function() {
      var processArguments = ['node', 'ionic', 'start', '.'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(log, 'error');
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();

      start.run({}, argv);
      expect(log.error).toHaveBeenCalled();
      expect(appLibUtils.preprocessCliOptions).not.toHaveBeenCalled();
    });

    it('should prompt for overwrite if the dir already exists, and cancel if user says no', function(done) {
      var processArguments = ['node', 'ionic', 'start', 'existingDir'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();
      spyOn(Start, 'promptForOverwrite').andReturn(Q(false));
      spyOn(Start, 'startApp');

      start.run({}, argv).then(function() {
        expect(appLibUtils.preprocessCliOptions).toHaveBeenCalled();
        expect(Start.promptForOverwrite).toHaveBeenCalled();
        expect(log.info).toHaveBeenCalled();
        expect(Start.startApp).not.toHaveBeenCalled();
        done();
      });
    });

    it('should not prompt for overwrite if the dir does not exist', function(done) {
      var processArguments = ['node', 'ionic', 'start', 'newDir'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(fs, 'existsSync').andReturn(false);
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();
      spyOn(Start, 'promptForOverwrite');
      spyOn(Start, 'startApp').andReturn(Q(true));
      spyOn(Start, 'printQuickHelp').andReturn(Q(true));
      spyOn(Start, 'promptLogin').andReturn(Q(true));

      start.run({}, argv).then(function() {
        expect(appLibUtils.preprocessCliOptions).toHaveBeenCalled();
        expect(Start.promptForOverwrite).not.toHaveBeenCalled();
        expect(Start.startApp).toHaveBeenCalled();
        expect(Start.printQuickHelp).toHaveBeenCalled();
        expect(Start.promptLogin).toHaveBeenCalled();
        done();
      });
    });

    it('should catch error if any process throws', function(done) {
      var processArguments = ['node', 'ionic', 'start', 'newDir'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(fs, 'existsSync').andReturn(false);
      spyOn(log, 'error');
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();
      spyOn(Start, 'promptForOverwrite');
      spyOn(Start, 'startApp').andReturn(Q.reject(false));
      spyOn(Start, 'printQuickHelp');
      spyOn(Start, 'promptLogin');

      start.run({}, argv).catch(function() {
        expect(appLibUtils.preprocessCliOptions).toHaveBeenCalled();
        expect(Start.promptForOverwrite).not.toHaveBeenCalled();
        expect(Start.startApp).toHaveBeenCalled();
        expect(Start.printQuickHelp).not.toHaveBeenCalled();
        expect(Start.promptLogin).not.toHaveBeenCalled();
        done();
      });
    });


    it('should treat all numerically named folders and strings not integers', function(done) {
      var processArguments = ['node', 'ionic', 'start', '5887'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(fs, 'existsSync').andReturn(false);
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();
      spyOn(Start, 'promptForOverwrite');
      spyOn(Start, 'startApp').andReturn(Q(true));
      spyOn(Start, 'printQuickHelp').andReturn(Q(true));
      spyOn(Start, 'promptLogin').andReturn(Q(true));

      start.run({}, argv).then(function() {
        expect(appLibUtils.preprocessCliOptions.calls[0].args[0]._[1]).toEqual('5887');
        done();
      });
    });

    it('should print a getting started message with v2 projects', function(done) {
      var processArguments = ['node', 'ionic', 'start', 'newDir', '--v2'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(fs, 'existsSync').andReturn(false);
      spyOn(appLibUtils, 'preprocessCliOptions').andCallThrough();
      spyOn(Start, 'promptForOverwrite');
      spyOn(Start, 'startApp').andReturn(Q(true));
      spyOn(Start, 'printQuickHelp').andReturn(Q(true));
      spyOn(Start, 'promptLogin').andReturn(Q(true));

      start.run({}, argv).then(function() {
        expect(appLibUtils.preprocessCliOptions.calls[0].args[0].v2).toEqual(true);
        done();
      });
    });
  });
});
