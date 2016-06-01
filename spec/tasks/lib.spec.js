'use strict';

var rewire = require('rewire');
var path = require('path');
var fs = require('fs');
var optimist = require('optimist');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;
var utils = IonicAppLib.utils;
var lib = rewire('../../lib/ionic/lib');

describe('lib command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(utils, 'fail');
  });

  describe('command settings', function() {

    it('should have a title', function() {
      expect(lib.title).toBeDefined();
      expect(lib.title).not.toBeNull();
      expect(lib.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(lib.summary).toBeDefined();
      expect(lib.summary).not.toBeNull();
      expect(lib.summary.length).toBeGreaterThan(0);
    });

    it('should have a set of options with boolean defaults to true', function() {
      expect(lib.options).toEqual(jasmine.any(Object));
      expect(lib.options['--version|-v']).toEqual(jasmine.any(String));
    });
  });

  describe('lib commands', function() {

    it('should throw an error if the www directory is not found', function() {
      var processArguments = ['node', 'ionic', 'lib', 'update'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(fs, 'existsSync').andReturn(false);

      // Expect failure
      lib.run(null, argv, rawCliArguments);
      expect(utils.fail).toHaveBeenCalledWith(jasmine.any(String), 'lib');
    });
  });

  describe('loadVersionData method testing', function() {
    var loadVersionData = lib.__get__('loadVersionData');

    it('should load bower.json file if version.json does not exist', function() {
      spyOn(fs, 'existsSync').andCallFake(function(path) {
        return path === 'www/lib/ionic/bower.json';
      });
      spyOn(path, 'resolve').andCallFake(function(path) {
        return path;
      });
      spyOn(fs, 'readFileSync').andReturn('{ "stuff": "things" }');

      var result = loadVersionData();
      expect(result.usesBower).toEqual(true);
      expect(result.versionFilePath).toEqual('www/lib/ionic/bower.json');
      expect(result.local).toEqual({ stuff: 'things' });
    });

    it('should load version.json if it does exist', function() {
      spyOn(fs, 'existsSync').andCallFake(function(path) {
        return path === 'www/lib/ionic/version.json';
      });
      spyOn(path, 'resolve').andCallFake(function(path) {
        return path;
      });
      spyOn(fs, 'readFileSync').andReturn('{ "stuff": "things" }');

      var result = loadVersionData();
      expect(result.usesBower).toEqual(false);
      expect(result.versionFilePath).toEqual('www/lib/ionic/version.json');
      expect(result.local).toEqual({ stuff: 'things' });
    });

    it('should log error if version.json is malformed', function() {
      spyOn(fs, 'existsSync').andCallFake(function(path) {
        return path === 'www/lib/ionic/version.json';
      });
      spyOn(path, 'resolve').andCallFake(function(path) {
        return path;
      });
      spyOn(fs, 'readFileSync').andReturn('{ "stuff": "things }');

      loadVersionData();
      expect(log.error).toHaveBeenCalledWith('Unable to load ionic lib version information');
    });
  });

  /*
  describe('updateLibVersion method testing', function() {
    var updateLibVersion = lib.__get__('updateLibVersion');
    it('', function() {
      updateLibVersion();
    });
  });

  describe('printLibVersions method testing', function() {
    var printLibVersions = lib.__get__('printLibVersions');

    it('', function() {
      printLibVersions();
    });
  });

  describe('getVersionData method testing', function() {
    var getVersionData = lib.__get__('getVersionData');

    it('', function() {
      getVersionData();
    });
  });
  */
});
