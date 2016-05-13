var rewire = require('rewire');

describe('Start', function() {
  var startTask;

  beforeEach(function() {
    startTask = rewire('../lib/ionic/serve');
  });

  it('should have serve defined', function() {
    expect(startTask).toBeDefined();
  });
});
