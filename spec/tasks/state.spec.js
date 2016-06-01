'use strict';

var optimist = require('optimist');
var rewire = require('rewire');
var state = rewire('../../lib/ionic/state');
var IonicAppLib = require('ionic-app-lib');
var State = IonicAppLib.state;
var IonicProject = IonicAppLib.project;
var appLibUtils = IonicAppLib.utils;
var log = IonicAppLib.logging.logger;

describe('state command', function() {
  beforeEach(function() {
    spyOn(log, 'info');
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(state.title).toBeDefined();
      expect(state.title).not.toBeNull();
      expect(state.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(state.summary).toBeDefined();
      expect(state.summary).not.toBeNull();
      expect(state.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(state.args).toEqual(jasmine.any(Object));
      expect(state.args['<COMMAND>']).toEqual(jasmine.any(String));
    });

    it('should have options', function() {
      expect(state.options).toEqual(jasmine.any(Object));
      expect(state.options.save).toEqual(jasmine.any(String));
      expect(state.options.restore).toEqual(jasmine.any(String));
      expect(state.options.clear).toEqual(jasmine.any(String));
      expect(state.options.reset).toEqual(jasmine.any(String));
      expect(state.options['--plugins']).toEqual(jasmine.any(Object));
      expect(state.options['--platforms']).toEqual(jasmine.any(Object));
    });
  });

  describe('run function', function() {

    it('should fail if ionic project fails to laod', function() {
      var processArguments = ['node', 'ionic', 'state', 'other'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(appLibUtils, 'fail');
      spyOn(IonicProject, 'load').andCallFake(function() {
        throw new Error('oh broken');
      });

      state.run({}, argv);
      expect(appLibUtils.fail).toHaveBeenCalledWith('oh broken');
    });

    it('should fail if command is not identified', function() {
      var processArguments = ['node', 'ionic', 'state', 'other'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(log, 'error');
      spyOn(IonicProject, 'load');

      state.run({}, argv);
      expect(log.error).toHaveBeenCalledWith(jasmine.any(String));
    });

    it('should call State.saveState if command is save', function() {
      var processArguments = ['node', 'ionic', 'state', 'save'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(process, 'cwd').andReturn('/blah/dir');
      spyOn(State, 'saveState');

      state.run({}, argv);
      expect(State.saveState).toHaveBeenCalledWith('/blah/dir', {
        platforms: true,
        plugins: true
      });
    });

    it('should call State.restoreState if command is restore', function() {
      var processArguments = ['node', 'ionic', 'state', 'restore'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(process, 'cwd').andReturn('/blah/dir');
      spyOn(State, 'restoreState');

      state.run({}, argv);
      expect(State.restoreState).toHaveBeenCalledWith('/blah/dir', {
        platforms: true,
        plugins: true
      });
    });

    it('should call State.resetState if command is reset', function() {
      var processArguments = ['node', 'ionic', 'state', 'reset'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(process, 'cwd').andReturn('/blah/dir');
      spyOn(State, 'resetState');

      state.run({}, argv);
      expect(State.resetState).toHaveBeenCalledWith('/blah/dir', {
        platforms: true,
        plugins: true
      });
    });

    it('should call State.clearState if command is clear', function() {
      var processArguments = ['node', 'ionic', 'state', 'clear'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(process, 'cwd').andReturn('/blah/dir');
      spyOn(State, 'clearState');

      state.run({}, argv);
      expect(State.clearState).toHaveBeenCalledWith('/blah/dir', {
        platforms: true,
        plugins: true
      });
    });

    it('should update options for platforms and plugins values if they are passed', function() {
      var processArguments = ['node', 'ionic', 'state', 'clear', '--platforms', '--plugins'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(IonicProject, 'load');
      spyOn(process, 'cwd').andReturn('/blah/dir');
      spyOn(State, 'clearState');

      state.run({}, argv);
      expect(State.clearState).toHaveBeenCalledWith('/blah/dir', {
        platforms: true,
        plugins: true
      });
    });
  });
});
