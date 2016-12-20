'use strict';

var fs = require('fs');
var Q = require('q');
var rewire = require('rewire');
var cordovaUtils = rewire('../../lib/utils/cordova');
var optimist = require('optimist');
var IonicAppLib = require('ionic-app-lib');
var Project = require('ionic-app-lib').project;
var Serve = require('ionic-app-lib').serve;
var crossSpawn = require('cross-spawn');
var ConfigXml = require('ionic-app-lib').configXml;
var log = IonicAppLib.logging.logger;

describe('isPlatformInstalled', function() {
  it('should return true if the platform directory does exist', function(done) {
    spyOn(fs, 'stat').andCallFake(function(param, callback) {
      callback(null);
    });

    cordovaUtils.isPlatformInstalled('ios', '/tmp').then(function(result) {
      expect(result).toEqual(true);
      expect(fs.stat).toHaveBeenCalledWith('/tmp/platforms/ios', jasmine.any(Function));
      done();
    });
  });

  it('should return false if the platform directory does not exist', function(done) {
    spyOn(fs, 'stat').andCallFake(function() {
      throw new Error('Dir does not exist');
    });

    cordovaUtils.isPlatformInstalled('ios', '/tmp').then(function(result) {
      expect(result).toEqual(false);
      expect(fs.stat).toHaveBeenCalledWith('/tmp/platforms/ios', jasmine.any(Function));
      done();
    });
  });
});

describe('arePluginsInstalled', function() {
  it('should return true if the plugins directory does exist', function(done) {
    spyOn(fs, 'stat').andCallFake(function(param, callback) {
      callback(null);
    });

    cordovaUtils.arePluginsInstalled('/tmp').then(function(result) {
      expect(fs.stat).toHaveBeenCalledWith('/tmp/plugins', jasmine.any(Function));
      expect(result).toEqual(true);
      done();
    });
  });

  it('should return false if the plugins directory does not exist', function(done) {
    spyOn(fs, 'stat').andCallFake(function() {
      throw new Error('Dir does not exist');
    });

    cordovaUtils.arePluginsInstalled('/tmp').then(function(result) {
      expect(result).toEqual(false);
      expect(fs.stat).toHaveBeenCalledWith('/tmp/plugins', jasmine.any(Function));
      done();
    });
  });
});

describe('installPlatform', function() {
  beforeEach(function() {
    spyOn(log, 'info');
  });

  it('should call promiseSpawn', function(done) {
    var installPlatform = cordovaUtils.__get__('installPlatform');
    var promiseSpawnSpy = jasmine.createSpy('promiseSpawn');
    promiseSpawnSpy.andReturn(Q(true));
    var revertPromiseSpawnSpy = cordovaUtils.__set__('promiseSpawn', promiseSpawnSpy);


    installPlatform('ios').then(function() {
      expect(promiseSpawnSpy).toHaveBeenCalledWith('cordova', ['platform', 'add', 'ios']);
      revertPromiseSpawnSpy();
      done();
    });
  });
});

describe('installPlugins', function() {
  beforeEach(function() {
    spyOn(log, 'info');
  });

  it('should call promiseSpawn', function(done) {
    var installPlugins = cordovaUtils.__get__('installPlugins');
    var promiseSpawnSpy = jasmine.createSpy('promiseSpawn');
    promiseSpawnSpy.andReturn(Q(true));
    var revertPromiseSpawnSpy = cordovaUtils.__set__('promiseSpawn', promiseSpawnSpy);

    installPlugins().then(function() {
      expect(promiseSpawnSpy.calls[0].args)
        .toEqual(['cordova', ['plugin', 'add', '--save', 'cordova-plugin-device']]);
      expect(promiseSpawnSpy.calls[1].args)
        .toEqual(['cordova', ['plugin', 'add', '--save', 'cordova-plugin-console']]);
      expect(promiseSpawnSpy.calls[2].args)
        .toEqual(['cordova', ['plugin', 'add', '--save', 'cordova-plugin-whitelist']]);
      expect(promiseSpawnSpy.calls[3].args)
        .toEqual(['cordova', ['plugin', 'add', '--save', 'cordova-plugin-splashscreen']]);
      expect(promiseSpawnSpy.calls[4].args)
        .toEqual(['cordova', ['plugin', 'add', '--save', 'cordova-plugin-statusbar']]);
      expect(promiseSpawnSpy.calls[5].args)
        .toEqual(['cordova', ['plugin', 'add', '--save', 'ionic-plugin-keyboard']]);
      revertPromiseSpawnSpy();
      done();
    });
  });
});


describe('setupLiveReload', function() {
  var argv;
  var baseDir;

  beforeEach(function() {
    spyOn(log, 'info');
    argv = {};
    baseDir = '/some/base/dir';
  });
  afterEach(function() {
    argv = {};
    baseDir = '';
  });

  it('should return options on success', function(done) {
    argv.all = true;
    var processCwd = '/process/current/pwd';
    var project = { name: 'something' };
    var loadSettings = { address: '127.0.0.1', port: 80 };
    var serveHostValue = 'devServer value';
    var finalOptions = {
      port: 80,
      address: '0.0.0.0',
      appDirectory: baseDir,
      runLivereload: true,
      launchBrowser: false,
      launchLab: false,
      isPlatformServe: true,
      devServer: serveHostValue
    };

    spyOn(process, 'cwd').andReturn(processCwd);
    spyOn(Project, 'load').andReturn(project);
    spyOn(Serve, 'loadSettings').andReturn(loadSettings);
    spyOn(Serve, 'getAddress');
    spyOn(Serve, 'host').andReturn(serveHostValue);
    spyOn(Serve, 'checkPorts').andReturn(Q(true));
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
    spyOn(Serve, 'start');
    spyOn(Serve, 'showFinishedServeMessage');
    var setupLiveReload = cordovaUtils.__get__('setupLiveReload');

    setupLiveReload(argv, baseDir).then(function(options) {
      expect(Project.load).toHaveBeenCalledWith(baseDir);
      expect(Serve.loadSettings).toHaveBeenCalledWith(argv, project);
      expect(Serve.getAddress).not.toHaveBeenCalled();
      expect(Serve.host.calls[0].args).toEqual(['0.0.0.0', 80]);
      expect(Serve.checkPorts).toHaveBeenCalledWith(true, 80, '0.0.0.0', finalOptions);
      expect(ConfigXml.setConfigXml).toHaveBeenCalledWith(processCwd, { devServer: serveHostValue });
      expect(Serve.host.calls[1].args).toEqual(['0.0.0.0', 80]);
      expect(Serve.start).toHaveBeenCalledWith(finalOptions);
      expect(options).toEqual(finalOptions);
      done();
    });
  });
  it('should use address if it is supplied', function(done) {
    argv.address = '127.0.0.1';
    var processCwd = '/process/current/pwd';
    var project = { name: 'something' };
    var loadSettings = { address: '127.0.0.1', port: 80 };
    var serveHostValue = 'devServer value';
    var finalOptions = {
      port: 80,
      address: '127.0.0.1',
      appDirectory: baseDir,
      runLivereload: true,
      launchBrowser: false,
      launchLab: false,
      isPlatformServe: true,
      devServer: serveHostValue
    };

    spyOn(process, 'cwd').andReturn(processCwd);
    spyOn(Project, 'load').andReturn(project);
    spyOn(Serve, 'loadSettings').andReturn(loadSettings);
    spyOn(Serve, 'getAddress');
    spyOn(Serve, 'host').andReturn(serveHostValue);
    spyOn(Serve, 'checkPorts').andReturn(Q(true));
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
    spyOn(Serve, 'start');
    spyOn(Serve, 'showFinishedServeMessage');
    var setupLiveReload = cordovaUtils.__get__('setupLiveReload');

    setupLiveReload(argv, baseDir).then(function(options) {
      expect(Project.load).toHaveBeenCalledWith(baseDir);
      expect(Serve.loadSettings).toHaveBeenCalledWith(argv, project);
      expect(Serve.getAddress).not.toHaveBeenCalled();
      expect(Serve.host.calls[0].args).toEqual(['127.0.0.1', 80]);
      expect(Serve.checkPorts).toHaveBeenCalledWith(true, 80, '127.0.0.1', finalOptions);
      expect(ConfigXml.setConfigXml).toHaveBeenCalledWith(processCwd, { devServer: serveHostValue });
      expect(Serve.host.calls[1].args).toEqual(['127.0.0.1', 80]);
      expect(Serve.start).toHaveBeenCalledWith(finalOptions);
      expect(options).toEqual(finalOptions);
      done();
    });
  });
  it('should return options on success and gather address if not supplied', function(done) {
    var processCwd = '/process/current/pwd';
    var project = { name: 'something' };
    var loadSettings = { address: '127.0.0.1', port: 80 };
    var serveHostValue = 'devServer value';
    var finalOptions = {
      port: 80,
      address: '80.80.80.80',
      appDirectory: baseDir,
      runLivereload: true,
      launchBrowser: false,
      launchLab: false,
      isPlatformServe: true,
      devServer: serveHostValue
    };

    spyOn(process, 'cwd').andReturn(processCwd);
    spyOn(Project, 'load').andReturn(project);
    spyOn(Serve, 'loadSettings').andReturn(loadSettings);
    spyOn(Serve, 'getAddress').andCallFake(function(options) {
      options.address = '80.80.80.80';
      return Q(true);
    });
    spyOn(Serve, 'host').andReturn(serveHostValue);
    spyOn(Serve, 'checkPorts').andReturn(Q(true));
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
    spyOn(Serve, 'start');
    spyOn(Serve, 'showFinishedServeMessage');
    var setupLiveReload = cordovaUtils.__get__('setupLiveReload');

    setupLiveReload(argv, baseDir).then(function(options) {
      expect(Project.load).toHaveBeenCalledWith(baseDir);
      expect(Serve.loadSettings).toHaveBeenCalledWith(argv, project);
      expect(Serve.getAddress).toHaveBeenCalled();
      expect(Serve.host.calls[0].args).toEqual(['80.80.80.80', 80]);
      expect(Serve.checkPorts).toHaveBeenCalledWith(true, 80, '80.80.80.80', finalOptions);
      expect(ConfigXml.setConfigXml).toHaveBeenCalledWith(processCwd, { devServer: serveHostValue });
      expect(Serve.host.calls[1].args).toEqual(['80.80.80.80', 80]);
      expect(Serve.start).toHaveBeenCalledWith(finalOptions);
      expect(options).toEqual(finalOptions);
      done();
    });
  });

  it('should throw an error if the an error occurs within the promise chain', function(done) {
    var processCwd = '/process/current/pwd';
    var project = { name: 'something' };
    var loadSettings = { address: '127.0.0.1', port: 80 };
    var serveHostValue = 'devServer value';

    spyOn(process, 'cwd').andReturn(processCwd);
    spyOn(Project, 'load').andReturn(project);
    spyOn(Serve, 'loadSettings').andReturn(loadSettings);
    spyOn(Serve, 'getAddress').andCallFake(function(options) {
      options.address = '80.80.80.80';
      return Q(true);
    });
    spyOn(Serve, 'host').andReturn(serveHostValue);
    spyOn(Serve, 'checkPorts').andReturn(Q.reject('AN ERROR OCCURRED'));
    spyOn(ConfigXml, 'setConfigXml').andReturn(Q(true));
    spyOn(Serve, 'start');
    spyOn(Serve, 'showFinishedServeMessage');
    var setupLiveReload = cordovaUtils.__get__('setupLiveReload');

    setupLiveReload(argv, baseDir).catch(function() {
      expect(Project.load).toHaveBeenCalledWith(baseDir);
      expect(Serve.loadSettings).toHaveBeenCalledWith(argv, project);
      expect(Serve.getAddress).toHaveBeenCalled();
      expect(Serve.host.calls[0].args).toEqual(['80.80.80.80', 80]);
      done();
    });
  });
});

describe('execCordovaCommand', function() {
  beforeEach(function() {
    spyOn(crossSpawn, 'spawn').andCallThrough();
  });

  it('should execute the command against the cordova util', function(done) {
    var optionList = [
      'build',
      '-n',
      'ios'
    ];
    var isLiveReload = false;
    var serveOptions = {};

    cordovaUtils.execCordovaCommand(optionList, isLiveReload, serveOptions).catch(function() {
      expect(crossSpawn.spawn).toHaveBeenCalledWith('cordova', ['build', '-n', 'ios']);
      done();
    });
  });

  it('should execute the command against the cordova util using the platform provided', function(done) {
    var optionList = [
      'build',
      'android'
    ];
    var isLiveReload = false;
    var serveOptions = {};

    cordovaUtils.execCordovaCommand(optionList, isLiveReload, serveOptions).catch(function() {
      expect(crossSpawn.spawn).toHaveBeenCalledWith('cordova', ['build', 'android']);
      done();
    });
  });
});

describe('filterArgumentsForCordova', function() {

  it('should always leave the ionic command in the cordova command list', function() {
    var processArguments = ['node', 'ionic', 'build'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build']);
  });

  it('should remove all commands from the ignore list', function() {
    var processArguments = ['node', 'ionic', 'build',

      // Start - Ignore command list
      '--livereload', '-l',
      '--consolelogs', '-c',
      '--serverlogs', '-s',
      '--port', '-p',
      '--livereload-port',
      '-i', '-r',

      // End - Ignore command list
      'ios'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build', 'ios']);
  });

  it('should remove the address parameter and the parameter that follows it', function() {
    var processArguments = ['node', 'ionic', 'build',
      '--address', '0.0.0.0',
      '--blah', 'ios'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build', '--blah', 'ios']);
  });

  it('should remove the port parameter and the parameter that follows it', function() {
    var processArguments = ['node', 'ionic', 'build',
      '--port', '80',
      '--blah', 'ios'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build', '--blah', 'ios']);
  });

  it('should remove the shorthand port parameter and the parameter that follows it', function() {
    var processArguments = ['node', 'ionic', 'build',
      '-p', '80',
      '--blah', 'ios'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build', '--blah', 'ios']);
  });

  it('should remove the livereload-port parameter and the parameter that follows it', function() {
    var processArguments = ['node', 'ionic', 'build',
      '--livereload-port', '80',
      '--blah', 'ios'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build', '--blah', 'ios']);
  });

  it('should ensure that the --target= parameter contains double quotes when quotes are removed', function() {
    var processArguments = ['node', 'ionic', 'build',
      '--target=ios'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build', '--target=ios']);
  });
});
