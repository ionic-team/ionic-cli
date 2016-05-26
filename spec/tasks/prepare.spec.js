'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../lib/utils/cordova');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var prepare = require('../../lib/ionic/prepare');

describe('prepare command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(prepare.title).toBeDefined();
      expect(prepare.title).not.toBeNull();
      expect(prepare.title.length).toBeGreaterThan(0);
    });
  });

  describe('cordova platform and plugin checks', function() {

    var appDirectory = '/ionic/app/path';
    var processArguments = ['node', 'ionic', 'prepare'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(process, 'cwd').andReturn(appDirectory);
    });

    it('should try to install the cordova platform if it is not installed', function(done) {
      spyOn(cordovaUtils, 'execCordovaCommand').andReturn(Q(true));

      prepare.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['prepare']);
        done();
      });
    });
  });
});
