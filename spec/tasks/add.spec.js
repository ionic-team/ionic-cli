'use strict';

var optimist = require('optimist');
var childProcess = require('child_process');
var rewire = require('rewire');
var add = rewire('../../lib/ionic/add');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var ioLib = IonicAppLib.ioConfig;
var log = IonicAppLib.logging.logger;
var bower = require('../../lib/utils/bower');

describe('add command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(add.title).toBeDefined();
      expect(add.title).not.toBeNull();
      expect(add.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(add.summary).toBeDefined();
      expect(add.summary).not.toBeNull();
      expect(add.summary.length).toBeGreaterThan(0);
    });

    it('should have a boolean option of --nohooks or -n that defaults to true', function() {
      expect(add.args).toEqual(jasmine.any(Object));
      expect(add.args['[name]']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    var processArguments = ['node', 'ionic', 'add', 'thing'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(childProcess, 'execSync');
    });

    it('should fail if bower is not installed', function() {
      spyOn(appLibUtils, 'fail');
      spyOn(bower, 'checkForBower').andReturn(false);

      // Expect failure
      add.run(null, argv, rawCliArguments);
      expect(appLibUtils.fail).toHaveBeenCalledWith(bower.installMessage, 'add');
    });

    it('should fail if installBowerComponent throws an error obj message if the error has a message value', function() {
      spyOn(ioLib, 'injectIoComponent');
      spyOn(ioLib, 'warnMissingData');
      spyOn(appLibUtils, 'fail');
      spyOn(bower, 'checkForBower').andReturn(true);
      var installBowerSpy = jasmine.createSpy('installBowerSpy');
      installBowerSpy.andCallFake(function() {
        throw new Error('something failed');
      });
      var revertInstallBowerSpy = add.__set__('installBowerComponent', installBowerSpy);

      // Expect failure
      add.run(null, argv, rawCliArguments);
      expect(installBowerSpy).toHaveBeenCalledWith('thing');
      expect(appLibUtils.fail).toHaveBeenCalledWith('something failed', 'service');

      // TODO: things seems incorrect
      expect(ioLib.injectIoComponent).toHaveBeenCalledWith(true, 'thing');
      expect(ioLib.warnMissingData).toHaveBeenCalled();
      revertInstallBowerSpy();
    });

    it('should fail if installBowerComponent throws an error if the error has a message value', function() {
      spyOn(ioLib, 'injectIoComponent');
      spyOn(ioLib, 'warnMissingData');
      spyOn(appLibUtils, 'fail');
      spyOn(bower, 'checkForBower').andReturn(true);
      var installBowerSpy = jasmine.createSpy('installBowerSpy');
      installBowerSpy.andCallFake(function() {
        throw 'something';
      });
      var revertInstallBowerSpy = add.__set__('installBowerComponent', installBowerSpy);

      // Expect failure
      add.run(null, argv, rawCliArguments);
      expect(installBowerSpy).toHaveBeenCalledWith('thing');
      expect(appLibUtils.fail).toHaveBeenCalledWith('something', 'service');

      // TODO: things seems incorrect
      expect(ioLib.injectIoComponent).toHaveBeenCalledWith(true, 'thing');
      expect(ioLib.warnMissingData).toHaveBeenCalled();
      revertInstallBowerSpy();
    });

    it('should call injectIoComponent and warnMissingData on install success.', function() {
      spyOn(ioLib, 'injectIoComponent');
      spyOn(ioLib, 'warnMissingData');
      spyOn(bower, 'checkForBower').andReturn(true);

      var installBowerSpy = jasmine.createSpy('installBowerSpy');
      var revertInstallBowerSpy = add.__set__('installBowerComponent', installBowerSpy);

      add.run(null, argv, rawCliArguments);
      expect(bower.checkForBower).toHaveBeenCalled();
      expect(installBowerSpy).toHaveBeenCalledWith('thing');
      expect(ioLib.injectIoComponent).toHaveBeenCalledWith(true, 'thing');
      expect(ioLib.warnMissingData).toHaveBeenCalled();
      revertInstallBowerSpy();
    });
  });

  describe('installBowerComponent function', function() {

    it('should call childProcess execSync to install the bower component', function() {
      spyOn(log, 'info');
      spyOn(childProcess, 'execSync').andReturn({ code: 0 });

      var installBowerComponent = add.__get__('installBowerComponent');
      installBowerComponent('thing');
      expect(childProcess.execSync).toHaveBeenCalledWith('bower install --save-dev thing');
      expect(log.info).toHaveBeenCalledWith('Bower component installed - thing');
    });

    it('should call childProcess execSync and call util fail if result.code is not equal to 0', function() {
      spyOn(appLibUtils, 'fail');
      spyOn(childProcess, 'execSync').andReturn({ code: 1 });

      var installBowerComponent = add.__get__('installBowerComponent');
      installBowerComponent('thing');
      expect(childProcess.execSync).toHaveBeenCalledWith('bower install --save-dev thing');
      expect(appLibUtils.fail).toHaveBeenCalledWith(jasmine.any(String), 'add');
    });
  });
});
