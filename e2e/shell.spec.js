var helpers = require('./helpers');
var path = require('path');
var shell = require('shelljs');

var IonicAppLib = require('ionic-app-lib');

var tmpDir = helpers.tmpDir('create_test');
var appName = 'TestIonic';
var project = path.join(tmpDir, appName);
var optimist = require('optimist');
var utils = IonicAppLib.utils;

// What to test


// * [ ] Start
// * [ ] Serve
// * [ ] Run
// * [ ]


describe('end-to-end', function() {
  beforeEach(function() {
    jasmine.getEnv().defaultTimeoutInterval = 150000;
    optimist.boolean.reset();

    // Mock out call to get the app directory, return our project
    spyOn(utils, 'getProjectDirectory').andReturn(project);
    spyOn(IonicAppLib.multibar, 'newBar').andReturn({ tick: function() {} });

    console.log('Removing project', project);
    shell.rm('-rf', project);
    shell.mkdir('-p', tmpDir);

    // Copy over created project here.
  });

  afterEach(function() {
    process.chdir(path.join(__dirname, '..'));  // Needed to rm the dir on Windows.
    // shell.rm('-rf', tmpDir);
  });

  // This is working, Tim!
  describe('#start', function() {
    it('should start a v2 app without cordova cli', function() {
      console.log('Starting v2 app');
      shell.cd(tmpDir);

      // shell.rm('-rf', path.join(project, 'i2'));
      shell.exec('ionic start ' + appName + ' --v2');
      console.log('Ionic v2 app start completed. Now checking files existing.');
      expect(path.join(project, 'node_modules', 'ionic-framework')).toExist();
      expect(path.join(project, 'www', 'index.html')).toExist();

      // expect(path.join(project, 'hooks', 'before_prepare', '01_gulp_build.js')).toExist();
      console.log('v2 start completed');

      // done();
      return;
    });
  });
});
