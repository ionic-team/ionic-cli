'use strict';

var sinon = require('sinon');
var Q = require('q');
var cordovaUtils = require('../../lib/utils/cordova');

// var childProcess = require('child_process');

var os = require('os');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var build = require('../../lib/ionic/build');

describe('build command settings', function() {

  it('should have a title', function() {
    expect(build.title).toBeDefined();
    expect(build.title).not.toBeNull();
    expect(build.title.length).toBeGreaterThan(0);
  });

  it('should have a summary', function() {
    expect(build.summary).toBeDefined();
    expect(build.summary).not.toBeNull();
    expect(build.summary.length).toBeGreaterThan(0);
  });

  it('should have a boolean option of --nohooks or -n that defaults to true', function() {
    expect(build.options).toEqual(jasmine.any(Object));
    expect(build.options['--nohooks|-n']).toEqual(jasmine.any(Object));
  });
});


describe('build command cordova platform checks', function() {

  // This argv should model after optimist objects
  // $ ionic build -n
  var argv = {
    _: [
      'build'
    ],
    n: true,
    nohooks: false
  };
  var appDirectory = '/ionic/app/path';
  var setConfigXml;

  beforeEach(function() {
    spyOn(process, 'cwd').andReturn(appDirectory);
    spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
    spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);

    setConfigXml = sinon.stub(ConfigXml, 'setConfigXml').returns(Q(true));
  });

  afterEach(function() {
    setConfigXml.restore();
  });

  it('should default to iOS for the platform', function(done) {
    spyOn(os, 'platform').andReturn('darwin');

    build.run(null, argv).then(function() {
      expect(cordovaUtils.isPlatformInstalled).toHaveBeenCalledWith('ios', appDirectory);
      done();
    });
  });

  it('should fail if the system is not Mac and the platform is iOS', function(done) {
    spyOn(os, 'platform').andReturn('windows');

    build.run(null, argv).catch(function(error) {
      expect(error).toEqual('✗ You cannot run iOS unless you are on Mac OSX.');
      done();
    });
  });
});


describe('build command cordova platform and plugin checks', function() {

  // This argv should model after optimist objects
  // $ ionic build -n
  var argv = {
    _: [
      'build'
    ],
    n: true,
    nohooks: false
  };
  var appDirectory = '/ionic/app/path';
  var setConfigXml;
  var installPlatform;
  var installPlugins;

  beforeEach(function() {
    spyOn(process, 'cwd').andReturn(appDirectory);
    spyOn(os, 'platform').andReturn('darwin');

    setConfigXml = sinon.stub(ConfigXml, 'setConfigXml');
    installPlatform = sinon.stub(cordovaUtils, 'installPlatform');
    installPlugins = sinon.stub(cordovaUtils, 'installPlugins');
  });

  afterEach(function() {
    setConfigXml.restore();
    installPlatform.restore();
    installPlugins.restore();
  });

  it('should try to install the cordova platform if it is not installed', function(done) {
    spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(false);

    build.run(null, argv).then(function() {
      expect(installPlatform.callCount).toEqual(1);
      sinon.assert.calledWith(installPlatform, 'ios');
      done();
    }).catch(done);
  });

  it('should not try to install the cordova platform if it is installed', function(done) {
    spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);

    build.run(null, argv).then(function() {
      expect(installPlatform.callCount).toEqual(0);
      done();
    }).catch(done);
  });

  it('should install plugins if they are not installed', function(done) {
    spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
    spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(false);

    build.run(null, argv).then(function() {
      expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
      expect(installPlugins.callCount).toEqual(1);
      done();
    }).catch(done);
  });

  it('should not install plugins if they are installed', function(done) {
    spyOn(cordovaUtils, 'isPlatformInstalled').andReturn(true);
    spyOn(cordovaUtils, 'arePluginsInstalled').andReturn(true);
    spyOn(cordovaUtils, 'installPlugins').andReturn(Q(true));

    build.run(null, argv).then(function() {
      expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
      expect(installPlugins.callCount).toEqual(0);
      done();
    }).catch(done);
  });
});

/*
describe('execute cordova command', function() {
    spyOn(childProcess, 'exec').andCallThrough();
      expect(childProcess.exec).toHaveBeenCalledWith('cordova ', jasmine.any(Function));

  it('should should execute the command agains cordova cli', function() {
  });
});
*/
