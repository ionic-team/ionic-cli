'use strict';

var rewire = require('rewire');
var ionitron = rewire('../../lib/utils/ionitron');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;

describe('print function', function() {
  it('should return an array of strings', function() {
    spyOn(log, 'info');
    ionitron.print();

    // TODO: really should test better but its ionitron
    expect(log.info).toHaveBeenCalled();
  });

  it('should return an array of strings', function() {
    spyOn(log, 'info');
    ionitron.print('es');

    // TODO: really should test better but its ionitron
    expect(log.info).toHaveBeenCalled();
  });
});
