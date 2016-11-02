'use strict';

var optimist = require('optimist');
var info = require('../../lib/ionic/info');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var appLibInfo = IonicAppLib.info;
var Q = require('q');

describe('info command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(info.title).toBeDefined();
      expect(info.title).not.toBeNull();
      expect(info.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(info.summary).toBeDefined();
      expect(info.summary).not.toBeNull();
      expect(info.summary.length).toBeGreaterThan(0);
    });
  });

  describe('run function', function() {
    var processArguments = ['node', 'ionic', 'info'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    it('should fail if any Info task throws', function(done) {
      spyOn(appLibUtils, 'fail');
      spyOn(appLibInfo, 'gatherInfo').andCallFake(function() {
        return Q.reject(new Error('error stuff'));
      });
      spyOn(appLibInfo, 'printInfo');
      spyOn(appLibInfo, 'checkRuntime');

      // Expect failure
      info.run(null, argv, rawCliArguments).fin(function() {
        expect(appLibInfo.gatherInfo).toHaveBeenCalled();
        expect(appLibUtils.fail).toHaveBeenCalled();

        expect(appLibInfo.printInfo).not.toHaveBeenCalled();
        expect(appLibInfo.checkRuntime).not.toHaveBeenCalled();
        done();
      });
    });

    it('should gather info', function(done) {
      var gatheredInfo = { info: 'hi' };
      spyOn(appLibUtils, 'fail');
      spyOn(process, 'cwd').andReturn('/hello/how/areyou');
      spyOn(appLibInfo, 'gatherInfo').andReturn(Q(gatheredInfo));
      spyOn(appLibInfo, 'printInfo');
      spyOn(appLibInfo, 'checkRuntime');

      // Expect failure
      info.run(null, argv, rawCliArguments).then(function() {
        expect(appLibInfo.gatherInfo).toHaveBeenCalled();
        expect(appLibInfo.printInfo).toHaveBeenCalledWith(gatheredInfo);
        expect(appLibInfo.checkRuntime).toHaveBeenCalled();

        expect(appLibUtils.fail).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
