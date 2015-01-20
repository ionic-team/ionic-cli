var argv = require('optimist').argv,
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats,
    _ = require('underscore');

var ions = [
  {
    ion: 'ionic-ion-header-shrink',
    name: 'Header Shrink',
    description: 'A shrinking header effect like Facebook\'s'
  },
  {
    ion: 'ionic-ion-drawer',
    name: 'Android Drawer',
    description: 'Android-style drawer menu'
  },
  {
    ion: 'ionic-ion-ios-buttons',
    name: 'iOS Rounded Buttons',
    description: 'iOS "Squircle" style icons'
  },
  {
    ion: 'ionic-ion-swipe-cards',
    name: 'Swipeable Cards',
    description: 'Swiping interaction as seen in Jelly'
  },
  {
    ion: 'ionic-ion-tinder-cards',
    name: 'Tinder Cards',
    description: 'Tinder style card swiping interaction'
  }
]

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic) {
  console.log('Ionic Ions - ions power your app to be awesome.');
  console.log('A curated collection of useful addons, components, and ux interactions for extending ionic.')
  console.log('\n')

  _.each(ions, function(ion) {

    var rightColumn = 20;
    var dots = '';
    var indent = '';
    var x, arg;

    var startStr = ion.name;


    while( (startStr + dots).length < rightColumn + 1) {
      dots += '.';
    }

    // Header Shrink ... A shrinking header effect like Facebook\'s .. 
    var installStr = ['\'ionic add ', ion.ion, '\''].join('')
    console.log(ion.name, dots, installStr)
    console.log(ion.description, '\n')
  })
}

exports.IonicTask = IonicTask;
