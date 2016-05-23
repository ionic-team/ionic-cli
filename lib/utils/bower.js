'use strict';

require('colors');

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

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
      return require(bowerFilePath);
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
    console.log(('Error saving ' + bowerFilePath + ': ' + e).red.bold);
  }
}

function checkForBower() {
  var installed = false;
  try {
    var result = exec('bower -v', { silent: true });
    if (result.output.indexOf('command not found') === -1 && result.output.indexOf('not recognized') === -1) {
      installed = true;
    }
  } catch (ex) {
    throw ex;
  }
  return installed;
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
