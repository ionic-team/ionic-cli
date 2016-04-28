var argv = require('optimist').argv;

function HelpTask() {}

HelpTask.prototype.run = function(ionic) {
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
};

exports.IonicTask = HelpTask;
