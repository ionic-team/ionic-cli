var fs = require('fs'),
    helpers = require('./helpers'),
    path = require('path'),
    Q = require('q'),
    request = require('request'),
    shell = require('shelljs');

var IonicCli = require('../lib/cli');
var IonicAppLib = require('ionic-app-lib');
var Serve = IonicAppLib.serve;

var tmpDir = helpers.tmpDir('create_test');
var appName = 'TestIonic';
var appId = 'org.ionic.testing';
var project = path.join(tmpDir, appName);
var optimist = require('optimist');
var start = IonicAppLib.start;
var utils = IonicAppLib.utils;
var optimistSpy;

// What to test


// * [ ] Start
// * [ ] Serve
// * [ ] Run
// * [ ] 


ddescribe('end-to-end', function() {
  beforeEach(function() {
      jasmine.getEnv().defaultTimeoutInterval = 150000;
      // if (optimistSpy) {
      //   optimistSpy.reset();
      // }
      optimistSpy = spyOn(optimist, 'boolean');
      optimist.boolean.reset();

      //Mock out call to get the app directory, return our project
      spyOn(utils, 'getProjectDirectory').andReturn(project);

      //Disable console.log statements
      // spyOn(IonicAppLib.events, 'on');
      // spyOn(process.stdout, 'write');
      spyOn(IonicAppLib.multibar, 'newBar').andReturn({tick: function(){}});


      shell.rm('-rf', project);
      shell.mkdir('-p', tmpDir);

      //Copy over created project here.

  });

  afterEach(function() {
      process.chdir(path.join(__dirname, '..'));  // Needed to rm the dir on Windows.
      // shell.rm('-rf', tmpDir);
  });

  describe('#start', function(){
    xit('should start a new app', function(done) {
      shell.cd(tmpDir);
      shell.exec('echo "yes" | ionic start s1');
      // expect(path.join(project, 's1', 'www', 'index.html')).toExist();
      // expect(path.join(project, 's1', 'www', 'templates', 'tabs.html')).toExist();
      shell.cd(path.join(tmpDir, 's1'));

      // var deferred = Q.defer();

      // spyOn(Serve, 'showFinishedServeMessage').andReturn(deferred.promise);

      Q()
      .then(function() {
        // var deferred = Q.defer();
        // shell.exec('ionic serve -b & ', {async: true});
          // deferred.resolve();
        // });
        // return deferred.promise;
      })
      .then(function(){
        console.log('ionic serve is done');
        var deferred = Q.defer();

        request({ url: 'http://0.0.0.0:8100' }, function(err, res, body) {
          try {
            console.log('body returned', body);
            deferred.resolve(body);
          } catch(e) {
            deferred.reject(body);
          }
        });
        return deferred.promise;
      })
      .then(function(result) {
        console.log('result:', result);
        expect(result).toBe(true);
      })
      .catch(function(err){
        expect('this').toBe('not this');
      })
      .fin(done);

    });

    iit('should start a new app and run it', function() {
      shell.cd(tmpDir);
      shell.exec('echo "yes" | ionic start ' + appName);
      shell.cd(project);
      
      expect(path.join(project, 'www', 'index.html')).toExist();
      expect(path.join(project, 'www', 'templates', 'tabs.html')).toExist();
      
      shell.exec('ionic plugin add org.apache.cordova.splashscreen');
      
      expect(path.join(project, 'plugins', 'org.apache.cordova.splashscreen', 'plugin.xml')).toExist();
      
      shell.exec('ionic platform add android');

      expect(path.join(project, 'platforms', 'android', 'AndroidManifest.xml')).toExist();
      expect(path.join(project, 'resources', 'icon.png')).toExist();

      shell.exec('ionic hooks add');
      expect(path.join(project, 'hooks', 'after_plugin_add', '010_register_plugin.js')).toExist();

      shell.exec('ionic hooks remove');
      expect(path.join(project, 'hooks', 'after_plugin_add', '010_register_plugin.js')).not.toExist();

      shell.exec('ionic build ios');
      expect(path.join(project, 'platforms', 'ios', 'build', 'emulator', [appName, '.app'].join(''), 'config.xml')).toExist();

      shell.exec('ionic build android');
      //NOTE this expects you're using ant to build. In cordova android 4.0.0 - gradle is used, ant-build wont be there.
      expect(path.join(project, 'platforms', 'android', 'ant-build', 'MainActivity-debug.apk')).toExist();
      expect(path.join(project, 'platforms', 'android', 'build.xml')).toExist();

      shell.exec('ionic browser add crosswalk');
      expect(path.join(project, 'engine', 'xwalk-webviews')).toExist();

      shell.exec('ionic build android');
      expect(path.join(project, 'platforms', 'android', 'gradle.properties')).toExist();
      expect(path.join(project, 'platforms', 'android', 'build', 'outputs', 'apk', 'android-armv7-debug.apk')).toExist();
      expect(path.join(project, 'platforms', 'android', 'build', 'outputs', 'apk', 'android-x86-debug.apk')).toExist();

    });
  });
});
