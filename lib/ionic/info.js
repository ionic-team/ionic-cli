'use strict';

var extend = require('../utils/extend');
var path = require('path');
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
  try {

    var info = Info.gatherInfo();

    Info.getIonicVersion(info, process.cwd());
    Info.getIonicCliVersion(info, path.join(__dirname, '../../'));

    Info.printInfo(info);

    Info.checkRuntime();
  } catch (ex) {
    appLibUtils.fail('There was an error retrieving your environment information:', ex);
  }
}

module.exports = extend(settings, {
  run: run
});
