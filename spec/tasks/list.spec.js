'use strict';

var optimist = require('optimist');
var childProcess = require('child_process');
var rewire = require('rewire');
var list = rewire('../../lib/ionic/list');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var fs = require('fs');
var log = IonicAppLib.logging.logger;

describe('list command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(list.title).toBeDefined();
      expect(list.title).not.toBeNull();
      expect(list.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(list.summary).toBeDefined();
      expect(list.summary).not.toBeNull();
      expect(list.summary.length).toBeGreaterThan(0);
    });
  });

  describe('run function', function() {
    var processArguments = ['node', 'ionic', 'list', 'thing'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(childProcess, 'exec');
    });

    it('should fail if list Components throws', function() {
      spyOn(appLibUtils, 'fail');
      var listComponentsSpy = jasmine.createSpy('listComponentsSpy');
      listComponentsSpy.andCallFake(function() {
        throw new Error('something failed');
      });
      var revertListComponentsSpy = list.__set__('listComponents', listComponentsSpy);

      // Expect failure
      list.run(null, argv, rawCliArguments);
      expect(listComponentsSpy).toHaveBeenCalled();
      expect(appLibUtils.fail).toHaveBeenCalledWith('something failed', 'list');
      revertListComponentsSpy();
    });

    it('should fail if list Components throws an error string', function() {
      spyOn(appLibUtils, 'fail');
      var listComponentsSpy = jasmine.createSpy('listComponentsSpy');
      listComponentsSpy.andCallFake(function() {
        throw 'something failed';
      });
      var revertListComponentsSpy = list.__set__('listComponents', listComponentsSpy);

      // Expect failure
      list.run(null, argv, rawCliArguments);
      expect(listComponentsSpy).toHaveBeenCalled();
      expect(appLibUtils.fail).toHaveBeenCalledWith('something failed', 'list');
      revertListComponentsSpy();
    });
  });

  describe('listComponents function', function() {

    it('should call log.info for every component in devDependencies', function() {
      spyOn(log, 'info');
      spyOn(fs, 'readFileSync');
      spyOn(JSON, 'parse').andReturn({
        devDependencies: {
          stuff: '1',
          things: '1'
        }
      });

      var listComponents = list.__get__('listComponents');
      listComponents('thing');
      expect(log.info.calls[0].args[0]).toEqual('Ions, bower components, or addons installed:');
      expect(log.info.calls[1].args[0]).toMatch('stuff');
      expect(log.info.calls[2].args[0]).toMatch('things');
    });

    it('should call childProcess exec and call util fail if result.code is not equal to 0', function() {
      spyOn(log, 'error');
      spyOn(childProcess, 'exec').andReturn({ code: 1 });

      var listComponents = list.__get__('listComponents');
      listComponents('thing');
      expect(log.error).toHaveBeenCalledWith(jasmine.any(String));
    });
  });
});
