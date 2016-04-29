'use strict';

var _ = require('underscore');

var settings = {
  title: 'help',
  name: 'help',
  summary: 'Provides help for a certain command',
  args: {
    '[command]': 'The command you desire help with'
  },
  disableChangePwd: true
};

function run(ionic, argv) {
  var command = argv._[1] ? argv._[1] : '';

  var task = ionic.getTaskWithName(command);

  if (command === '') {
    ionic.printHelpLines();
    return;
  } else if (!task) {
    console.log('Command not found.'.red.bold);
    return;
  }

  ionic.printIonic();
  process.stderr.write('\n=======================\n');

  ionic.printUsage(task);

  process.stderr.write('\n\n');
}

module.exports = _.extend(settings, {
  run: run
});
