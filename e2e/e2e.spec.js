var fs = require('fs'),
    helpers = require('./helpers'),
    path = require('path'),
    Q = require('q'),
    shell = require('shelljs');

var IonicCli = require('../lib/cli');
var IonicAppLib = require('ionic-app-lib');

var tmpDir = helpers.tmpDir('create_test');
var appName = 'TestIonic';
var appId = 'org.ionic.testing';
var project = path.join(tmpDir, appName);
var optimist = require('optimist');
var start = IonicAppLib.start;
var utils = IonicAppLib.utils;
var optimistSpy;


describe('end-to-end', function() {
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
  });
  afterEach(function() {
      process.chdir(path.join(__dirname, '..'));  // Needed to rm the dir on Windows.
      // shell.rm('-rf', tmpDir);
  });

  describe('#start e2e', function() {
    it('should call start with default template and folder name', function(done) {
      console.log('default template');
      var args = { _: ['start', 'test'], verbose: true};
      //Mock out args from the commands.
      // optimistSpy.andReturn({argv: args});
      optimistSpy.andCallFake(function(){
        return {argv: args};
      });

      Q()
      .then(function() {
        return IonicCli.run(args);
      }).then(function(){
        expect(path.join(project, 'www', 'index.html')).toExist();
        expect(path.join(project, 'www', 'templates', 'tabs.html')).toExist();
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call start with sidemenu template and folder name', function(done) {
      console.log('sidemenu template');
      var args = { _: ['start', 'test', 'sidemenu'], verbose: true};
      //Mock out args from the commands.
      // optimistSpy.andReturn({argv: args});
      optimistSpy.andCallFake(function(){
        return {argv: args};
      });

      Q()
      .then(function() {
        return IonicCli.run(args);
      }).then(function(){
        expect(path.join(project, 'www', 'index.html')).toExist();
        expect(path.join(project, 'www', 'templates', 'menu.html')).toExist();
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });

    it('should call start with blank template and folder name', function(done) {
      var args = { _: ['start', 'test', 'blank'], verbose: true};
      //Mock out args from the commands.
      optimistSpy.andCallFake(function(){
        return {argv: args};
      });

      Q()
      .then(function() {
        return IonicCli.run(args);
      }).then(function(){
        expect(path.join(project, 'www', 'index.html')).toExist();
        expect(path.join(project, 'www', 'js', 'app.js')).toExist();
      })
      .catch(function(error) {
        expect('this').toBe('not this');
      })
      .fin(done);
    });
  });
});
