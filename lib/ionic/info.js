'use strict';

var extend = require('../utils/extend');
var IonicAppLib = require('ionic-app-lib');
var Info = IonicAppLib.info;
var appLibUtils = IonicAppLib.utils;

var settings = {
  title: 'info',
  name: 'info',
  summary: 'List information about the users runtime environment',
  isProjectTask: false
};

function run() {
  return Info.gatherInfo().then(function(info) {
    Info.printInfo(info);

    Info.checkRuntime(info);
  }).catch(function(ex) {
    appLibUtils.fail('There was an error retrieving your environment information:', ex);
  });
}

module.exports = extend(settings, {
  run: run
});
