'use strict';

var rewire = require('rewire');
var helpUtils = rewire('../../lib/utils/help');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;

describe('printIonic function', function() {
  it('should return an array of strings', function() {
    var printIonic = helpUtils.__get__('printIonic');
    var results = printIonic();

    expect(results).toEqual(jasmine.any(Array));
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toEqual(jasmine.any(String));
  });
});

describe('printTemplate function', function() {
  it('should log an array as a new line seperated string', function() {
    spyOn(log, 'info');
    var printTemplate = helpUtils.__get__('printTemplate');
    printTemplate(['red', 'green', '', null]);

    expect(log.info).toHaveBeenCalledWith('red\ngreen\n\n');
  });
});

describe('printTaskListUsage method', function() {
  it('should call printTaskDetails for all tasks with a summary', function() {
    spyOn(log, 'info');
    spyOn(log, 'error');
    var printTaskRevert = helpUtils.__set__('printTaskDetails', function(param) {
      log.error(param);
    });

    var taskList = [
      {
        name: 'one',
        summary: 'one summary'
      },
      {
        name: 'two',
        summary: 'two summary'
      },
      {
        name: 'three'
      }
    ];
    helpUtils.printTaskListUsage(taskList, 'v2.0.0');
    expect(log.error.calls.length).toEqual(2);
    printTaskRevert();
  });
});

describe('printTaskListShortUsage method', function() {
  it('should print ionic logo, a header and the each task details', function() {
    var printIonicSpy = jasmine.createSpy('printIonicSpy');
    printIonicSpy.andReturn('ionic logo');
    var revertPrintIonic = helpUtils.__set__('printIonic', printIonicSpy);

    var printTemplateSpy = jasmine.createSpy('printTemplateSpy');
    var revertPrintTemplate = helpUtils.__set__('printTemplate', printTemplateSpy);

    spyOn(log, 'info');
    var taskList = [
      {
        name: 'one',
        summary: 'one summary'
      },
      {
        name: 'two',
        summary: 'two summary'
      },
      {
        name: 'three'
      }
    ];
    helpUtils.printTaskListShortUsage(taskList, null, 'v2.0.0');
    var arrayArgs = printTemplateSpy.calls[0].args[0];
    expect(arrayArgs[0]).toEqual('ionic logo');
    expect(arrayArgs[1]).toEqual('');
    expect(arrayArgs[2]).toEqual('Usage: ionic task args');
    expect(arrayArgs[3]).toEqual('');
    expect(arrayArgs[4]).toEqual('');
    expect(arrayArgs[5]).toEqual('=======================');
    expect(arrayArgs[6]).toEqual(null);
    revertPrintIonic();
    revertPrintTemplate();
  });

  it('should identify the task does not exist if taskname is provided', function() {
    var printIonicSpy = jasmine.createSpy('printIonicSpy');
    printIonicSpy.andReturn('ionic logo');
    var revertPrintIonic = helpUtils.__set__('printIonic', printIonicSpy);

    var printTemplateSpy = jasmine.createSpy('printTemplateSpy');
    var revertPrintTemplate = helpUtils.__set__('printTemplate', printTemplateSpy);

    spyOn(log, 'info');
    var taskList = [
      {
        name: 'one',
        summary: 'one summary'
      },
      {
        name: 'two',
        summary: 'two summary'
      },
      {
        name: 'three'
      }
    ];
    helpUtils.printTaskListShortUsage(taskList, 'fudge', 'v2.0.0');
    var arrayArgs = printTemplateSpy.calls[0].args[0];
    expect(arrayArgs[6]).toMatch('fudge is not a valid task');
    revertPrintIonic();
    revertPrintTemplate();
  });
});

describe('printTaskUsage method', function() {
  it('should log info', function() {
    spyOn(log, 'info');
    spyOn(log, 'error');
    var printTaskRevert = helpUtils.__set__('printTaskDetails', function(param) {
      log.error(param);
    });

    helpUtils.printTaskUsage({}, 'v2.0.0');
    expect(log.error.calls.length).toEqual(1);
    printTaskRevert();
  });
});

describe('printTaskDetails function', function() {
  it('should write to process log', function() {
    var settings = {
      title: 'platform',
      name: 'platform',
      summary: 'Add platform target for building an Ionic app',
      args: {
        '[options]': '',
        '<PLATFORM>': ''
      },
      options: {
        '--noresources|-r': {
          title: 'Do not add default Ionic icons and splash screen resources',
          boolean: true
        },
        '--nosave|-e': {
          title: 'Do not save the platform to the package.json file',
          boolean: true
        }
      }
    };
    spyOn(process.stdout, 'write');
    var printTaskDetails = helpUtils.__get__('printTaskDetails');
    printTaskDetails(settings);
    expect(process.stdout.write).toHaveBeenCalled();
  });
});
