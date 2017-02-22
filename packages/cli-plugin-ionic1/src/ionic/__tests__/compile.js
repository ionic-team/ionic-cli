'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../utils/cordova');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var compile = require('../compile');

describe('compile command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(process, 'cwd').and.returnValue('/some/directory');
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(compile.title).toBeDefined();
      expect(compile.title).not.toBeNull();
      expect(compile.title.length).toBeGreaterThan(0);
    });
  });

  describe('run function', function() {
    var processArguments = ['node', 'ionic', 'compile', 'set'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    it('should fail if any functions throw', function(done) {
      var error = new Error('error occurred');
      spyOn(ConfigXml, 'setConfigXml').and.returnValue(Q.reject(error));

      compile.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should fail if any functions throw and not log if error is not instanceof Error', function(done) {
      var error = 1;
      spyOn(ConfigXml, 'setConfigXml').and.returnValue(Q.reject(error));

      compile.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).not.toHaveBeenCalled();
        done();
      });
    });

    it('should call execCordovaCommand and return a promise', function(done) {
      spyOn(ConfigXml, 'setConfigXml').and.returnValue(Q(true));
      spyOn(cordovaUtils, 'filterArgumentsForCordova').and.returnValue(['compile', 'set']);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));

      compile.run({}, argv, rawCliArguments).then(function(results) {
        expect(ConfigXml.setConfigXml).toHaveBeenCalledWith('/some/directory', {
          resetContent: true,
          errorWhenNotFound: false
        });
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['compile', 'set']);
        expect(results).toEqual(true);
        done();
      });
    });
  });
});
