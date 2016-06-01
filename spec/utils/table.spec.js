'use strict';

var cliTable = require('cli-table');
var Table = require('../../lib/utils/table');

describe('Table prototype', function() {
  it('should call through to cliTable with defaulted options', function() {
    spyOn(cliTable, 'call').andCallThrough();

    var t = new Table();

    expect(cliTable.call).toHaveBeenCalledWith(t, {
      chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: ' ',
        'left-mid': '',
        right: '',
        'right-mid': ''
      },
      style: {
        compact: true,
        head: ['yellow']
      }
    });
  });

  it('should call through to cliTable with extended options', function() {
    spyOn(cliTable, 'call').andCallThrough();

    var t = new Table({
      other: 'red'
    });

    expect(cliTable.call).toHaveBeenCalledWith(t, {
      chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: ' ',
        'left-mid': '',
        right: '',
        'right-mid': ''
      },
      style: {
        compact: true,
        head: ['yellow']
      },
      other: 'red'
    });
  });
});
