var fs = require('fs'),
    path = require('path'),
    shelljs = require('shelljs'),
    os = require('os'),
    argv = require('optimist').argv,
    IonicProject = require('./project'),
    Task = require('./task').Task,
    IonicStats = require('./stats').IonicStats;

var IonicTask = function() {};

IonicTask.prototype = new Task();

// http://en.wikipedia.org/wiki/Darwin_%28operating_system%29#Release_history
IonicTask.prototype.getMacInfo = function() {
  //Need to get:
  //Look up for what version (Yosemite, Mavericks, Mountain Lion)
  //What version of Xcode
  var macVersion = 'Yosemite';
  switch(os.release()) {
    case '14.0.0':
      macVersion = 'Yosemite';
      break;
    case '13.0.0':
      macVersion = 'Mavericks';
      break;
    case '12.0.0':
    case '12.5.0':
      macVersion = 'Mountain Lion';
      break;
    case '11.4.2':
      macVersion = 'Lion';
      break;
    case '10.8':
      macVersion = 'Snow Leopard';
      break;
  }

  return 'Mac OS X ' + macVersion;
  // console.log('Mac OS X', macVersion);
}

IonicTask.prototype.getCordovaInfo = function(info) {
  var command = 'cordova -v';
  var result = shelljs.exec(command, { silent: true });
  if(result.code != 0) {
    info.cordova = 'Not installed';
    return;
  }

  info.cordova = result.output.replace('\n', '');
}

IonicTask.prototype.getXcodeInfo = function() {
  var result = shelljs.exec('/usr/bin/xcodebuild -version', { silent: true });
  if(result.code != 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ')
  return version;
}

IonicTask.prototype.getIosSimInfo = function() {
  var result = shelljs.exec('ios-sim --version', { silent: true });
  if(result.code != 0) {
    return 'Not installed';
  }
  var version = result.output.replace(/\n/g, ' ')
  return version;
}

IonicTask.prototype.getIonicVersions = function(info) {
  var ionicCliVersion = require('../../package.json').version;

  info.ionic_cli = ionicCliVersion;

  try {
    var ionicVersionFile = require(path.resolve('www/lib/ionic/version.json'));
    var ionicVersion = ionicVersionFile.version;

    info.ionic = ionicVersion;
  } catch (ex) {}

}

// Windows XP  5.1.2600
// Windows Server 2003 5.2.3790
// Windows Vista
// Windows Server 2008 6.0.6000
// Windows Vista, SP2  6.0.6002
// Windows 7
// Windows Server 2008 R2  6.1.7600
// Windows 7 SP1
// Windows Server 2008 R2 SP1  6.1.7601
// Windows 8
// Windows Server 2012 6.2.9200
// Windows 8.1
// Windows Server 2012 R2  6.3.9600
// Windows 10 Technical Preview  6.4.9841

IonicTask.prototype.getWindowsEnvironmentInfo = function() {
  // Windows version reference
  // http://en.wikipedia.org/wiki/Ver_%28command%29
  var version = os.release();
  var windowsVersion = null;
  switch(version) {
    case '5.1.2600':
      windowsVersion = 'Windows XP';
      break;
    case '6.0.6000':
      windowsVersion = 'Windows Vista';
      break;
    case '6.0.6002':
      windowsVersion = 'Windows Vista SP2';
      break;
    case '6.1.7600':
      windowsVersion = 'Windows 7';
      break;
    case '6.1.7601':
      windowsVersion = 'Windows 7 SP1';
      break;
    case '6.2.9200':
      windowsVersion = 'Windows 8';
      break;
    case '6.3.9600':
      windowsVersion = 'Windows 8.1';
      break;
  }

  return windowsVersion;
}

IonicTask.prototype.getLinuxEnvironmentInfo = function() {
  var result = shelljs.exec('lsb_release -id', { silent: true });
  return result.output.replace(/\n/g, ' ')
}

//http://stackoverflow.com/questions/6551006/get-my-os-from-the-node-js-shell
IonicTask.prototype.getOsEnvironment = function(info) {
  var self = this;

  switch(os.type()) {
    case 'Darwin':
      info.os = self.getMacInfo();
      info.xcode = self.getXcodeInfo();
      info.ios_sim = self.getIosSimInfo();
      break;
    case 'Windows_NT':
      info.os = self.getWindowsEnvironmentInfo();
      break;
    case 'Linux':
      info.os = self.getLinuxEnvironmentInfo();
      break;
  }
}

IonicTask.prototype.getNodeVersion = function(info) {
  var command = 'node -v';
  var result = shelljs.exec(command, { silent: true } );
  info.node = result.output.replace('\n','');
}

IonicTask.prototype.gatherInfo = function() {
  var self = this;
  var info = {};
  //For macs we want:
  //Mac version, xcode version (if installed)

  //For windows
  //Windows version

  //For all
  // Android SDK info
  // Cordova CLI info
  // Ionic CLI version
  // Ionic version

  // var info = {
  //   cordova: 'CLI v3.5.0',
  //   os: 'Mac OSX Yosemite',
  //   xcode: 'Xcode 6.1.1',
  //   ionic: '1.0.0-beta.13',
  //   ionic_cli: '1.3.0'
  // };

  self.getIonicVersions(info);

  self.getNodeVersion(info);

  self.getOsEnvironment(info);

  self.getCordovaInfo(info);

  // self.printJavaInformation();
  return info;
}

IonicTask.prototype.printInfo = function(info) {
  console.log('\nYour system information:\n');
  console.log('OS:', info.os);
  console.log('Node Version:', info.node);
  console.log('Cordova CLI:', info.cordova);
  if (info.ionic) {
    console.log('Ionic Version:', info.ionic);
  }
  console.log('Ionic CLI Version:', info.ionic_cli);
  if(info.xcode) {
    console.log('Xcode version:', info.xcode);
  }

  if(info.ios_sim) {
    console.log('ios-sim version:', info.ios_sim);
  }
  console.log('\n');
}

IonicTask.prototype.run = function(ionic) {

  var info = this.gatherInfo();
  this.printInfo(info);
  IonicStats.t();
}

exports.IonicTask = IonicTask;
