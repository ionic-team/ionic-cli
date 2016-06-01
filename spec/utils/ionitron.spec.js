'use strict';

var rewire = require('rewire');
var ionitron = rewire('../../lib/utils/ionitron');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;

describe('print function', function() {
  it('should return an array of strings', function() {
    spyOn(log, 'info');
    ionitron.print();

    expect(log.info).toHaveBeenCalled();
    var printedLines = log.info.calls[0].args[0];
    expect(log.info).toHaveBeenCalled();
    expect(printedLines).not.toMatch(
      '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'
    );
  });

  it('should return an array of strings', function() {
    spyOn(log, 'info');
    ionitron.print('es');

    var printedLines = log.info.calls[0].args[0];
    expect(log.info).toHaveBeenCalled();
    expect(printedLines).not.toMatch(
      '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'
    );
  });
});
