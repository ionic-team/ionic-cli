'use strict';

var optimist = require('optimist');
var rewire = require('rewire');
var Q = require('q');
var serveTask = rewire('../../lib/ionic/serve');
var IonicAppLib = require('ionic-app-lib');
var IonicProject = IonicAppLib.project;
var Serve = IonicAppLib.serve;
var log = IonicAppLib.logging.logger;
var appLibUtils = IonicAppLib.utils;
var npmScripts = require('../../lib/utils/npmScripts');

describe('Serve', function() {

  beforeEach(function() {
    spyOn(log, 'info');
  });

  describe('command settings', function() {
    it('should have a title', function() {
      expect(serveTask.title).toBeDefined();
      expect(serveTask.title).not.toBeNull();
      expect(serveTask.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(serveTask.summary).toBeDefined();
      expect(serveTask.summary).not.toBeNull();
      expect(serveTask.summary.length).toBeGreaterThan(0);
    });

    it('should have args', function() {
      expect(serveTask.args).toEqual(jasmine.any(Object));
      expect(serveTask.args['[options]']).toEqual(jasmine.any(String));
    });

    it('should have options', function() {
      expect(serveTask.options).toEqual(jasmine.any(Object));
      expect(serveTask.options['--consolelogs|-c']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--serverlogs|-s']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--port|-p']).toEqual(jasmine.any(String));
      expect(serveTask.options['--livereload-port|-r']).toEqual(jasmine.any(String));
      expect(serveTask.options['--nobrowser|-b']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--nolivereload|-d']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--noproxy|-x']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--address']).toEqual(jasmine.any(String));
      expect(serveTask.options['--all|-a']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--browser|-w']).toEqual(jasmine.any(String));
      expect(serveTask.options['--browseroption|-o']).toEqual(jasmine.any(String));
      expect(serveTask.options['--lab|-l']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--nogulp']).toEqual(jasmine.any(Object));
      expect(serveTask.options['--platform|-t']).toEqual(jasmine.any(String));
    });
  });

  describe('run command', function() {
    beforeEach(function() {
      spyOn(process, 'cwd').andReturn('/some/project/dir');
      spyOn(log, 'error');
    });

    it('should fail if loading the ionic project fails', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '--livereload', '--nogulp'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('some error');

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andCallFake(function() {
        throw error;
      });

      serveTask.run({}, argv).then(function() {
        expect(log.error).toHaveBeenCalledWith(jasmine.any(String), error);
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        done();
      });
    });

    it('should fail if loading the ionic project fails', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '--livereload', '--nogulp'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('some error');

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andReturn({
        get: function() {
          return false;
        }
      });
      process.env = {};
      spyOn(Serve, 'getAddress').andCallFake(function() {
        throw error;
      });

      serveTask.run({}, argv).then(function() {
        expect(log.error).toHaveBeenCalledWith(jasmine.any(String), error);
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        done();
      });
    });

    it('should call appLibUtils when chain fails', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '-a'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('some error');

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andReturn({
        get: function() {
          return false;
        }
      });
      process.env = {};
      spyOn(Serve, 'getAddress').andReturn(Q());
      spyOn(Serve, 'checkPorts').andReturn(Q.reject(error));

      spyOn(Serve, 'start');
      spyOn(Serve, 'showFinishedServeMessage');

      serveTask.run({}, argv).then(function() {
        expect(Serve.checkPorts).toHaveBeenCalled();
        expect(Serve.start).not.toHaveBeenCalled();
        expect(Serve.showFinishedServeMessage).not.toHaveBeenCalled();
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();

        expect(log.error).toHaveBeenCalledWith(jasmine.any(String), error);
        done();
      });
    });

    it('should use IP of 0.0.0.0 if -a is supplied', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '-a'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andReturn({
        get: function() {
          return false;
        }
      });
      process.env = {};
      spyOn(Serve, 'getAddress').andReturn(Q());

      spyOn(Serve, 'checkPorts');
      spyOn(Serve, 'start');
      spyOn(Serve, 'showFinishedServeMessage');

      serveTask.run({}, argv).then(function() {
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(Serve.getAddress).not.toHaveBeenCalled();
        expect(Serve.start.calls[0].args[0].address).toBe('0.0.0.0');
        done();
      });
    });

    it('should use IP of 0.0.0.0 if --all is supplied', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '--all'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andReturn({
        get: function() {
          return false;
        }
      });
      process.env = {};
      spyOn(Serve, 'getAddress').andReturn(Q());

      spyOn(Serve, 'checkPorts');
      spyOn(Serve, 'start');
      spyOn(Serve, 'showFinishedServeMessage');

      serveTask.run({}, argv).then(function() {
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(Serve.getAddress).not.toHaveBeenCalled();
        expect(Serve.start.calls[0].args[0].address).toBe('0.0.0.0');
        done();
      });
    });

    it('should use IP of --address if supplied', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '--address', '192.168.1.10'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andReturn({
        get: function() {
          return false;
        }
      });
      process.env = {};
      spyOn(Serve, 'getAddress').andReturn(Q());

      spyOn(Serve, 'checkPorts');
      spyOn(Serve, 'start');
      spyOn(Serve, 'showFinishedServeMessage');

      serveTask.run({}, argv).then(function() {
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(Serve.getAddress).not.toHaveBeenCalled();
        expect(Serve.start.calls[0].args[0].address).toBe('192.168.1.10');
        done();
      });
    });

    it('should use connect live reload port from env var', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '--livereload', '--nogulp'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andReturn({});
      spyOn(Serve, 'loadSettings').andReturn({});
      spyOn(Serve, 'getAddress').andReturn(Q());

      spyOn(Serve, 'checkPorts');
      spyOn(Serve, 'start');
      spyOn(Serve, 'showFinishedServeMessage');

      process.env = { CONNECT_LIVE_RELOAD_PORT: 5000 };

      var options = {
        appDirectory: '/some/project/dir',
        liveReloadPort: 5000,
        nogulp: true
      };

      serveTask.run({}, argv).then(function() {
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(Serve.start).toHaveBeenCalledWith(options);
        done();
      });
    });

    it('should use connect live reload port from default', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '--livereload'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(false));
      spyOn(npmScripts, 'runIonicScript');
      spyOn(IonicProject, 'load').andReturn({
        get: function() {
          return false;
        }
      });
      process.env = {};
      spyOn(Serve, 'getAddress').andReturn(Q());

      spyOn(Serve, 'checkPorts');
      spyOn(Serve, 'start');
      spyOn(Serve, 'showFinishedServeMessage');

      serveTask.run({}, argv).then(function() {
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(Serve.start.calls[0].args[0].liveReloadPort).toBe(35729);
        done();
      });
    });

    it('should call runIonicScript if hasIonicScript is true', function(done) {
      var processArguments = ['node', 'ionic', 'serve', '--livereload', '--nogulp'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(npmScripts, 'hasIonicScript').andReturn(Q(true));
      spyOn(npmScripts, 'runIonicScript').andReturn(Q(true));

      serveTask.run({}, argv).then(function() {
        expect(npmScripts.hasIonicScript).toHaveBeenCalledWith('serve');
        expect(npmScripts.runIonicScript).toHaveBeenCalledWith('serve', argv);
        done();
      });
    });
  });
});
