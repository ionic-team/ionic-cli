var _ = require('underscore');
var cliTable = require('cli-table');

function Table(options) {
  if (!options) {
    options = {};
  }

  cliTable.call(this, _.extend({
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
  }, options));
}

Table.prototype = Object.create(cliTable.prototype);

module.exports = Table;
