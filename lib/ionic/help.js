'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var helpUtil = require('../utils/help');

var settings = {
  title: 'help',
  name: 'help',
  summary: 'Provides help for a certain command',
  args: {
    '[command]': 'The command you desire help with'
  },
  isProjectTask: false
};

function run(ionic, argv) {
  var taskName = argv._[1] ? argv._[1] : '';

  // If no task name is provided then print all help available
  if (taskName === '') {
    var taskList = ionic.getAllTaskSettings();
    return helpUtil.printTaskListUsage(taskList, ionic.VERSION);
  }

  // If a task name is provided and is valid then print Usage
  var task = ionic.getTaskSettingsByName(taskName);
  if (task) {
    return helpUtil.printTaskUsage(task, ionic.VERSION);
  }

  return console.log(chalk.red.bold('Command not found.'));
}

module.exports = extend(settings, {
  run: run
});
