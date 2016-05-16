'use strict';

var fs = require('fs');
var cordovaUtils = require('../../lib/utils/cordova');
var optimist = require('optimist');

describe('isPlatformInstalled', function() {
  it('should return true if the platform directory does exist', function() {
    spyOn(fs, 'statSync').andCallFake(function() {
      return;
    });

    var result = cordovaUtils.isPlatformInstalled('ios', '/tmp');

    expect(result).toEqual(true);
    expect(fs.statSync).toHaveBeenCalledWith('/tmp/platforms/ios');
  });

  it('should return false if the platform directory does not exist', function() {
    spyOn(fs, 'statSync').andCallFake(function() {
      throw new Error('Dir does not exist');
    });

    var result = cordovaUtils.isPlatformInstalled('ios', '/tmp');

    expect(result).toEqual(false);
    expect(fs.statSync).toHaveBeenCalledWith('/tmp/platforms/ios');
  });
});

describe('argePluginsInstalled', function() {
  it('should return true if the plugins directory does exist', function() {
    spyOn(fs, 'statSync').andCallFake(function() {
      return;
    });

    var result = cordovaUtils.arePluginsInstalled('/tmp');

    expect(result).toEqual(true);
    expect(fs.statSync).toHaveBeenCalledWith('/tmp/plugins');
  });

  it('should return false if the plugins directory does not exist', function() {
    spyOn(fs, 'statSync').andCallFake(function() {
      throw new Error('Dir does not exist');
    });

    var result = cordovaUtils.arePluginsInstalled('/tmp');

    expect(result).toEqual(false);
    expect(fs.statSync).toHaveBeenCalledWith('/tmp/plugins');
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
    expect(resultArgs).toEqual(['build', '--target="ios"']);
  });
  it('should ensure that the --target= parameter contains double quotes when quotes are not removed', function() {
    var processArguments = ['node', 'ionic', 'build',
      '--target="ios"'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var cmdName = argv._[0];

    var resultArgs = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawCliArguments);
    expect(resultArgs).toEqual(['build', '--target="ios"']);
  });
});

describe('setupLiveReload', function() {
});

