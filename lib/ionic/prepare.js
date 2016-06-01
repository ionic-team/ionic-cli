'use strict';

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var cordovaUtils = require('../utils/cordova');

var settings = {
  title: 'prepare',
  name: 'prepare',
  isProjectTask: true
};

function run(ionic, argv, rawCliArguments) {
  var appDirectory = process.cwd();
  var rawArgs = rawCliArguments.slice(0);
  var cmdName = argv._[0].toLowerCase();

  // ensure the content node was set back to its original
  return ConfigXml.setConfigXml(appDirectory, {
    resetContent: true,
    errorWhenNotFound: false
  })
  .then(function() {
    var optionList = cordovaUtils.filterArgumentsForCordova(cmdName, argv, rawArgs);
    return cordovaUtils.execCordovaCommand(optionList);
  });
}

module.exports = extend(settings, {
  run: run
});
