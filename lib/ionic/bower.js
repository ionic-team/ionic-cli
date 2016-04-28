require('shelljs/global');
require('colors');

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var IonicBower = {

  setIonicVersion: function(newVersion) {
    var bowerData = this.getData();
    if (!bowerData.devDependencies) bowerData.devDependencies = {};
    bowerData.devDependencies.ionic = 'driftyco/ionic-bower#' + newVersion;
    this.saveData(bowerData);
  },

  setAppName: function(newAppName) {
    var bowerData = this.getData();
    bowerData.name = newAppName;
    this.saveData(bowerData);
  },

  getData: function() {
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
  },

  saveData: function(bowerData) {
    try {
      var bowerFilePath = path.resolve('bower.json');
      fs.writeFileSync(bowerFilePath, JSON.stringify(bowerData, null, 2));
    } catch (e) {
      console.log(('Error saving ' + bowerFilePath + ': ' + e).red.bold);
    }
  },

  checkForBower: function checkForBower() {
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
  },

  installMessage: 'You must have bower installed to continue. \nType `npm install -g bower`'
};

module.exports = IonicBower;
