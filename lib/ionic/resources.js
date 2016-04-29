'use strict';

var _ = require('underscore');
var argv = require('optimist').argv;
var IonicAppLib = require('ionic-app-lib');
var IonicResources = IonicAppLib.resources;
var IonicStats = require('../utils/stats').IonicStats;
var fail = IonicAppLib.utils.fail;
var Project = IonicAppLib.project;

var resourcesSummary = [
  'Automatically create icon and splash screen resources' + ' (beta)'.yellow,
  'Put your images in the ./resources directory, named splash or icon.',
  'Accepted file types are .png, .ai, and .psd.',
  'Icons should be 192x192 px without rounded corners.',
  'Splashscreens should be 2208x2208 px, with the image centered in the middle.\n'
].join('\n\t\t      ');

var settings = {
  title: 'resources',
  name: 'resources',
  summary: resourcesSummary,
  options: {
    '--icon|-i': {
      title: 'Generate icon resources',
      boolean: true
    },
    '--splash|-s': {
      title: 'Generate splash screen resources',
      boolean: true
    }
  },
  module: './ionic/resources'
};

function run() {
  var dir = null;

  try {
    dir = process.cwd();
    Project.load(dir);
  } catch (ex) {
    return fail(ex, 'resources');
  }

  var options = argv;
  options.platforms = argv._;

  IonicResources.generate(dir, options)
    .catch(function(ex) {
      if (ex instanceof Error) {
        fail(ex, 'resources');
      }
    });

  IonicStats.t();
}

module.exports = _.extend(settings, {
  run: run
});
