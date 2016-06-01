'use strict';

var optimist = require('optimist');
var rewire = require('rewire');
var Q = require('q');
var addressTask = rewire('../../lib/ionic/address');
var IonicAppLib = require('ionic-app-lib');
var Serve = IonicAppLib.serve;
var log = IonicAppLib.logging.logger;

describe('Serve', function() {

  beforeEach(function() {
    spyOn(log, 'info');
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(addressTask.title).toBeDefined();
      expect(addressTask.title).not.toBeNull();
      expect(addressTask.title.length).toBeGreaterThan(0);
    });
  });

  describe('run command', function() {
    it('should update config and gather the current address', function(done) {
      var processArguments = ['node', 'ionic', 'address'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var configSpy = jasmine.createSpyObj('config', ['set']);

      spyOn(IonicAppLib.config, 'load').andReturn(configSpy);
      spyOn(Serve, 'getAddress').andReturn(Q(true));

      addressTask.run({}, argv).then(function() {
        expect(IonicAppLib.config.load).toHaveBeenCalled();
        expect(configSpy.set.calls[0].args).toEqual(['ionicServeAddress', null]);
        expect(configSpy.set.calls[1].args).toEqual(['platformServeAddress', null]);
        expect(Serve.getAddress).toHaveBeenCalledWith({ isAddressCmd: true });
        done();
      }).catch(done);
    });
  });
});
