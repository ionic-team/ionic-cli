var IonicAppLib = require('ionic-app-lib'),
    IonicProject = IonicAppLib.project,
    Serve = IonicAppLib.serve,
    Q = require('q'),
    rewire = require('rewire');

var argv = { 
  _: ['--livereload'],
  nogulp: false
}

describe('Start', function() {
  var startTask;

  beforeEach(function() {
    startTask = rewire('../lib/ionic/serve');
  });

  it('should have serve defined', function() {
    expect(startTask).toBeDefined();
  });
});
