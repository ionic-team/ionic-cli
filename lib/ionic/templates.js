var colors = require('colors'),
    _ = require('underscore'),
    Task = require('./task').Task;
    IonicStats = require('./stats').IonicStats,
    starterTemplates = require('./starter-templates');

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.list = function list(templates) {
  //Should have array of [{ name: 'name', description: 'desc' }]
  _.each(templates, function(template) {
    var rightColumn = 20, dots = '';
    var shortName = template.name.replace('ionic-starter-', '');
    while( (shortName + dots).length < rightColumn + 1) {
      dots += '.';
    }
    var outStr = []
    console.log(shortName.green, dots, template.description);
  })
}

IonicTask.prototype.run = function(ionic) {
  var templates = _.sortBy(starterTemplates.items, function(template){ return template.name; });
  console.log('Ionic Starter templates'.green);
  this.list(templates);

  IonicStats.t();

}

exports.IonicTask = IonicTask;
