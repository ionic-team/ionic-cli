'use strict';

var optimist = require('optimist');
var help = require('../../lib/ionic/help');
var helpUtils = require('../../lib/utils/help');
var ionic = require('../../lib/cli');

describe('help command', function() {
  describe('command settings', function() {
    it('should have a title', function() {
      expect(help.title).toBeDefined();
      expect(help.title).not.toBeNull();
      expect(help.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(help.summary).toBeDefined();
      expect(help.summary).not.toBeNull();
      expect(help.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(help.args).toEqual(jasmine.any(Object));
      expect(help.args['[command]']).toEqual(jasmine.any(String));
    });
  });

  describe('run function', function() {
    it('should print all task help if a command is not provided', function() {
      var processArguments = ['node', 'ionic', 'help'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(ionic, 'getAllTaskSettings').andReturn([
        { name: '1' },
        { name: '2' },
        { name: '3' }
      ]);
      spyOn(ionic, 'getTaskSettingsByName');
      spyOn(helpUtils, 'printTaskListUsage');

      // Expect failure
      help.run(ionic, argv, rawCliArguments);
      expect(ionic.getAllTaskSettings).toHaveBeenCalled();
      expect(helpUtils.printTaskListUsage).toHaveBeenCalledWith([
        { name: '1' },
        { name: '2' },
        { name: '3' }
      ], ionic.VERSION);
    });

    it('should print a help for a command if provided', function() {
      var processArguments = ['node', 'ionic', 'help', 'red'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(ionic, 'getAllTaskSettings');
      spyOn(ionic, 'getTaskSettingsByName').andReturn({
        name: 'red',
        summary: 'some summary'
      });
      spyOn(helpUtils, 'printTaskListUsage');
      spyOn(helpUtils, 'printTaskUsage');

      // Expect failure
      help.run(ionic, argv, rawCliArguments);
      expect(ionic.getAllTaskSettings).not.toHaveBeenCalled();
      expect(ionic.getTaskSettingsByName).toHaveBeenCalledWith('red');
      expect(helpUtils.printTaskUsage).toHaveBeenCalledWith({
        name: 'red',
        summary: 'some summary'
      }, ionic.VERSION);
    });

    it('should print an error if the command is not found', function() {
      var processArguments = ['node', 'ionic', 'help', 'black'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(ionic, 'getTaskSettingsByName').andReturn(null);
      spyOn(helpUtils, 'printTaskListUsage');
      spyOn(helpUtils, 'printTaskUsage');
      spyOn(console, 'log');

      // Expect failure
      help.run(ionic, argv, rawCliArguments);
      expect(ionic.getTaskSettingsByName).toHaveBeenCalledWith('black');
      expect(console.log).toHaveBeenCalledWith(jasmine.any(String));
    });
  });
});
