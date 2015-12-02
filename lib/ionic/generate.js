var fs = require('fs'),
    path = require('path'),
    Task = require('./task').Task,
    ionicAppLib = require('ionic-app-lib'),
    Q = require('q'),
    Utils = ionicAppLib.utils,
    logging = ionicAppLib.logging,
    Info = ionicAppLib.info;

var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {
  /*
      Usage: `ionic generate` or `ionic g`
      ionic generate <generator> <name>

      ionic g page about             * generate page in pwd/www/app/about - about.html, about.js, about.scss
      ionic g page about --tabs
  */
  try {
    var generator = argv._[1];
    var listing = false;

    if (!Utils.isIonicV2(process.cwd())) {
      return Utils.fail('You do not appear to have a compatible version of Ionic v2 installed.\n' +
      'Ionic Framework v2 version 2.0.0-alpha.31 or later is required to use the generators.\n' +
      'Please run: "npm install ionic-framework"');
    }

    if (generator == 'help') {
      logging.logger.info('Get started using generators right now!')
      logging.logger.info('Generators help you set up code quickly to get running.');
      logging.logger.info('List all the generators by passing the --list option: "ionic g --list"');
      logging.logger.info('Or simply type "ionic g page MyPage" to generate a page!');
      return;
    }

    if (argv.list) {
      logging.logger.info('Available generators:');
      listing = true;
      // return;
    }

    var name = argv._[2];
    var promise;

    var ionicFrameworkModuleName = 'ionic-framework';
    // var ionicFrameworkModuleName = 'ionic2';
    var ionicModulePath = path.join(process.cwd(), 'node_modules', ionicFrameworkModuleName);

    try {
      ionicModule = require(ionicModulePath);

      if (listing) {
        for (gen in ionicModule.Generate.generators) {
          console.log(' *'.blue , gen);
        }
        return;
      } else {
        return ionicModule.generate({appDirectory: process.cwd(), generator: generator, name: name});
      }
    } catch (ex) {
      if (ex.message.indexOf('no generator available') != -1) {
        return console.log('✗ '.red + ex.message.red);
      }
      return Utils.fail('You do not appear to have a compatible version of Ionic v2 installed.\n' +
      'Ionic Framework v2 version 2.0.0-alpha.31 or later is required to use the generators.\n' +
      'Please run: "npm install ionic-framework"');
    }

  } catch (ex) {
    Utils.fail('There was an error generating your item:', ex);
  }
}

exports.IonicTask = IonicTask;
