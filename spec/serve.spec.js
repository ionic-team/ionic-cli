var IonicAppLib = require('ionic-app-lib'),
    IonicProject = IonicAppLib.project,
    Serve = IonicAppLib.serve,
    Q = require('q'),
    rewire = require('rewire'),
    Utils = IonicAppLib.utils;

var argv = { 
  _: ['--livereload'],
  nogulp: false
}

describe('Serve', function() {
  var serveTask;

  beforeEach(function() {
    serveTask = rewire('../lib/ionic/serve');

    spyOn(Utils, 'isIonicV2').andReturn(false);
    
  });

  it('should have serve defined', function() {
    expect(serveTask).toBeDefined();
  });

  it('should use connect live reload port from env var', function(done) {
    spyOn(IonicProject, 'load').andReturn({});
    spyOn(Serve, 'loadSettings').andReturn({});
    spyOn(Serve, 'getAddress').andReturn(Q());

    spyOn(Serve, 'checkPorts');
    spyOn(Serve, 'start');
    spyOn(Serve, 'showFinishedServeMessage');
    spyOn(process, 'cwd').andReturn('/ionic/app/path');

    process.env = { CONNECT_LIVE_RELOAD_PORT: 5000 };

    var serve = new serveTask.IonicTask();
    var options = {
      appDirectory: '/ionic/app/path',
      liveReloadPort: 5000,
      nogulp: false
    };

    Q()
    .then(function(){
      return serve.run({}, argv);
    })
    .then(function() {
      expect(Serve.start).toHaveBeenCalledWith(options);
    })
    .catch(function(ex){
      expect('this').toBe(ex.stack);
    })
    .fin(done);
  });

  it('should use connect live reload port from env var', function(done) {
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
    spyOn(process, 'cwd').andReturn('/ionic/app/path');

    var serve = new serveTask.IonicTask();

    Q()
    .then(function(){
      return serve.run({}, argv);
    })
    .then(function() {
      var calls = Serve.start.calls[0].args[0];
      expect(calls.liveReloadPort).toBe(35729);
    })
    .catch(function(ex){
      expect('this').toBe(ex.stack);
    })
    .fin(done);
  });
});
