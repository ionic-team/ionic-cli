var fs = require('fs'),
    path = require('path'),
    // argv = require('optimist').argv,
    Task = require('./task').Task,
    ionicAppLib = require('ionic-app-lib'),
    Info = ionicAppLib.info;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, arv) {
  this.ionic = ionic;

  try {
    console.log('**********************************************'.yellow)
    console.log('Getting started with Ionic v2\n'.green)
    console.log('Start a simple app: `ionic start MyIonicV2App --v2`\n');
    console.log('That will download the files you need as well as install node modules and cordova plugins.\n');
    console.log('Run `ionic serve` to serve the app in the browser.\n');
    console.log('**********************************************'.yellow);
    // console.log('* Transpiling files\n'.green);
    // console.log('Ionic is built on TypeScript/ES6. Files must be compiled and translated (commonly called transpiled) to JavaScript.\n');
    // console.log('When you make a change to your files with ionic serve, ionic cli will automatically transpile files and reload the browser.\n');
    // console.log('You can also run `ionic transpile` to transpile the files manually.\n');
    // console.log('Ionic cli also compiles sass for you `ionic transpile sass`.\n');
    // console.log('**********************************************'.yellow);
  } catch (ex) {
    this.ionic.fail('Unidentified error');
  }
}

exports.IonicTask = IonicTask;
