'use strict';

var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;

function setIonicVersion(newVersion) {
  var bowerData = this.getData();
  if (!bowerData.devDependencies) bowerData.devDependencies = {};
  bowerData.devDependencies.ionic = 'driftyco/ionic-bower#' + newVersion;
  this.saveData(bowerData);
}

function setAppName(newAppName) {
  var bowerData = this.getData();
  bowerData.name = newAppName;
  this.saveData(bowerData);
}

function getData() {
  var bowerFilePath = path.resolve('bower.json');

  try {
    if (fs.existsSync(bowerFilePath)) {
      return JSON.parse(fs.readFileSync(bowerFilePath));
    }
  } catch (e) {
    throw e;
  }

  return {
    name: 'HelloIonic',
    private: 'true'
  };
}

function saveData(bowerData) {
  try {
    var bowerFilePath = path.resolve('bower.json');
    fs.writeFileSync(bowerFilePath, JSON.stringify(bowerData, null, 2));
  } catch (e) {
    log.error(chalk.red.bold('Error saving ' + bowerFilePath + ': ' + e));
  }
}

function checkForBower() {
  try {
    var result = childProcess.execSync('bower -v', { silent: true, encoding: 'utf8' });
    if (result.indexOf('command not found') === -1 &&
        result.indexOf('not recognized') === -1) {
      return true;
    }
  } catch (ex) {} // eslint-disable-line no-empty
  return false;
}

var installMessage = 'You must have bower installed to continue. \nType `npm install -g bower`';

module.exports = {
  setIonicVersion: setIonicVersion,
  setAppName: setAppName,
  getData: getData,
  saveData: saveData,
  checkForBower: checkForBower,
  installMessage: installMessage
};
