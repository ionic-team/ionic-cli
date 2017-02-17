'use strict';

var chalk = require('chalk');
var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var IonicResources = IonicAppLib.resources;
var appLibUtils = IonicAppLib.utils;
var Project = IonicAppLib.project;

var resourcesSummary = [
  'Automatically create icon and splash screen resources' + chalk.yellow(' (beta)'),
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
  isProjectTask: true
};

function run(ionic, argv) {
  var dir = null;

  try {
    dir = process.cwd();
    Project.load(dir);
  } catch (ex) {
    return appLibUtils.fail(ex, 'resources');
  }

  var options = argv;
  options.platforms = argv._;

  return IonicResources.generate(dir, options)
    .catch(function(ex) {
      if (ex instanceof Error) {
        appLibUtils.fail(ex, 'resources');
      }
    });
}

module.exports = extend(settings, {
  run: run
});
