'use strict';

var optimist = require('optimist');
var IonicAppLib = require('ionic-app-lib');
var Hooks = IonicAppLib.hooks;
var log = IonicAppLib.logging.logger;
var appHooks = require('../../lib/ionic/hooks');

describe('hooks command', function() {
  var appDirectory = '/ionic/app/path';

  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(process, 'cwd').andReturn(appDirectory);
  });

  it('should log an error by default', function() {
    var processArguments = ['node', 'ionic', 'hooks'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    // Expect failure
    appHooks.run(null, argv, rawCliArguments);
    expect(log.error).toHaveBeenCalledWith('Please supply a command - either add or remove');
  });

  it('should log an error if the hooks command is unkown', function() {
    var processArguments = ['node', 'ionic', 'hooks', 'other'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    // Expect failure
    appHooks.run(null, argv, rawCliArguments);
    expect(log.error).toHaveBeenCalledWith('Please supply a command - either add or remove');
  });

  it('should log an error if an error is thrown', function() {
    var processArguments = ['node', 'ionic', 'hooks', 'permissions'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var errorText = 'oh no an error occurred.';

    spyOn(Hooks, 'setHooksPermission').andCallFake(function() {
      throw new Error(errorText);
    });

    // Expect failure
    appHooks.run(null, argv, rawCliArguments);
    expect(log.error).toHaveBeenCalledWith('There was an error running the hooks command: ', jasmine.any(String));
  });

  it('should call ionic-app-lib when command is add', function() {
    var processArguments = ['node', 'ionic', 'hooks', 'add'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    spyOn(Hooks, 'add');

    // Expect failure
    appHooks.run(null, argv, rawCliArguments);
    expect(Hooks.add).toHaveBeenCalledWith(appDirectory);
  });

  it('should call ionic-app-lib when command is remove', function() {
    var processArguments = ['node', 'ionic', 'hooks', 'remove'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    spyOn(Hooks, 'remove');

    // Expect failure
    appHooks.run(null, argv, rawCliArguments);
    expect(Hooks.remove).toHaveBeenCalledWith(appDirectory);
  });

  it('should call ionic-app-lib when command is perm', function() {
    var processArguments = ['node', 'ionic', 'hooks', 'perm'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    spyOn(Hooks, 'setHooksPermission');

    // Expect failure
    appHooks.run(null, argv, rawCliArguments);
    expect(Hooks.setHooksPermission).toHaveBeenCalledWith(appDirectory);
  });

  it('should call ionic-app-lib when command is permissions', function() {
    var processArguments = ['node', 'ionic', 'hooks', 'permissions'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    spyOn(Hooks, 'setHooksPermission');

    // Expect failure
    appHooks.run(null, argv, rawCliArguments);
    expect(Hooks.setHooksPermission).toHaveBeenCalledWith(appDirectory);
  });
});
