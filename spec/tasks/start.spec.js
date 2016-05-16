var rewire = require('rewire');

describe('Start', function() {
  var startTask;

  beforeEach(function() {
    startTask = rewire('../../lib/ionic/start');
  });

  it('should have serve defined', function() {
    expect(startTask).toBeDefined();
  });
});
