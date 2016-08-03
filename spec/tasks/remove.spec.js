'use strict';

var optimist = require('optimist');
var childProcess = require('child_process');
var rewire = require('rewire');
var remove = rewire('../../lib/ionic/remove');
var IonicAppLib = require('ionic-app-lib');
var appLibUtils = IonicAppLib.utils;
var ioLib = IonicAppLib.ioConfig;
var log = IonicAppLib.logging.logger;
var bower = require('../../lib/utils/bower');

describe('remove command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(remove.title).toBeDefined();
      expect(remove.title).not.toBeNull();
      expect(remove.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(remove.summary).toBeDefined();
      expect(remove.summary).not.toBeNull();
      expect(remove.summary.length).toBeGreaterThan(0);
    });

    it('should have a args', function() {
      expect(remove.args).toEqual(jasmine.any(Object));
      expect(remove.args['[name]']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    var processArguments = ['node', 'ionic', 'remove', 'thing'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(childProcess, 'execSync');
    });

    it('should fail if bower is not installed', function() {
      spyOn(appLibUtils, 'fail');
      spyOn(bower, 'checkForBower').andReturn(false);

      // Expect failure
      remove.run(null, argv, rawCliArguments);
      expect(appLibUtils.fail).toHaveBeenCalledWith(bower.installMessage, 'remove');
    });

    it('should fail if uninstall throws an error obj message if the error has a message value', function() {
      spyOn(ioLib, 'injectIoComponent');
      spyOn(ioLib, 'warnMissingData');
      spyOn(appLibUtils, 'fail');
      spyOn(bower, 'checkForBower').andReturn(true);

      var uninstallBowerSpy = jasmine.createSpy('uninstallBowerSpy');
      uninstallBowerSpy.andCallFake(function() {
        throw new Error('something failed');
      });
      var revertUninstallBowerSpy = remove.__set__('uninstallBowerComponent', uninstallBowerSpy);

      // Expect failure
      remove.run(null, argv, rawCliArguments);
      expect(uninstallBowerSpy).toHaveBeenCalledWith('thing');
      expect(appLibUtils.fail).toHaveBeenCalledWith('something failed', 'service');

      // TODO: things seems incorrect
      expect(ioLib.injectIoComponent).toHaveBeenCalledWith(false, 'thing');
      expect(ioLib.warnMissingData).toHaveBeenCalled();
      revertUninstallBowerSpy();
    });

    it('should fail if uninstallBowerComponent throws an error if the error has a message value', function() {
      spyOn(ioLib, 'injectIoComponent');
      spyOn(ioLib, 'warnMissingData');
      spyOn(appLibUtils, 'fail');
      spyOn(bower, 'checkForBower').andReturn(true);
      var uninstallBowerSpy = jasmine.createSpy('uninstallBowerSpy');
      uninstallBowerSpy.andCallFake(function() {
        throw 'something';
      });
      var revertInstallBowerSpy = remove.__set__('uninstallBowerComponent', uninstallBowerSpy);

      // Expect failure
      remove.run(null, argv, rawCliArguments);
      expect(uninstallBowerSpy).toHaveBeenCalledWith('thing');
      expect(appLibUtils.fail).toHaveBeenCalledWith('something', 'service');

      // TODO: things seems incorrect
      expect(ioLib.injectIoComponent).toHaveBeenCalledWith(false, 'thing');
      expect(ioLib.warnMissingData).toHaveBeenCalled();
      revertInstallBowerSpy();
    });

    it('should call injectIoComponent and warnMissingData on install success.', function() {
      spyOn(ioLib, 'injectIoComponent');
      spyOn(ioLib, 'warnMissingData');
      spyOn(bower, 'checkForBower').andReturn(true);

      var uninstallBowerSpy = jasmine.createSpy('uninstallBowerSpy');
      var revertInstallBowerSpy = remove.__set__('uninstallBowerComponent', uninstallBowerSpy);

      remove.run(null, argv, rawCliArguments);
      expect(bower.checkForBower).toHaveBeenCalled();
      expect(uninstallBowerSpy).toHaveBeenCalledWith('thing');
      expect(ioLib.injectIoComponent).toHaveBeenCalledWith(false, 'thing');
      expect(ioLib.warnMissingData).toHaveBeenCalled();
      revertInstallBowerSpy();
    });
  });

  describe('uninstallBowerComponent function', function() {

    it('should call childProcess execSync to install the bower component', function() {
      spyOn(log, 'info');
      spyOn(childProcess, 'execSync').andReturn({ code: 0 });

      var uninstallBowerComponent = remove.__get__('uninstallBowerComponent');
      uninstallBowerComponent('thing');
      expect(childProcess.execSync).toHaveBeenCalledWith('bower uninstall --save-dev thing');
      expect(log.info).toHaveBeenCalledWith(jasmine.any(String));
    });

    it('should call childProcess execSync and call util fail if result.code is not equal to 0', function() {
      spyOn(appLibUtils, 'fail');
      spyOn(childProcess, 'execSync').andReturn({ code: 1 });

      var uninstallBowerComponent = remove.__get__('uninstallBowerComponent');
      uninstallBowerComponent('thing');
      expect(childProcess.execSync).toHaveBeenCalledWith('bower uninstall --save-dev thing');
      expect(appLibUtils.fail).toHaveBeenCalledWith(jasmine.any(String), 'remove');
    });
  });
});
