'use strict';

var fs = require('fs');
var path = require('path');
var commands = require('../../lib/config/commands');

describe('orderedListOfCommands', function() {
  var listOfCommands = commands.orderedListOfCommands.slice(0);

  it('should have a corresponding command every task in ionic folder', function() {
    var taskFileList = fs
      .readdirSync(path.join(__dirname, '../../lib/ionic'))
      .filter(function(file) {
        var stat = fs.statSync(path.join(__dirname, '../../lib/ionic', file));
        return !stat.isDirectory();
      })
      .filter(function(file) {
        // stats is private to us, so ignore it
        return file !== 'stats.js';
      })
      .map(function(file) {
        return file.replace('.js', '');
      })
      .sort();

    expect(taskFileList).toEqual(listOfCommands.sort());
  });
});
