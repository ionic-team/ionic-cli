'use strict';

var prompt = require('prompt');
var promptUtil = require('../../lib/utils/prompt');

describe('prompt function', function() {
  it('should pass the prompt callback value to the resolved promise', function(done) {
    spyOn(prompt, 'get').andCallFake(function(schema, callback) {
      callback(null, 1000);
    });
    promptUtil.prompt({}, {}).then(function(value) {
      expect(value).toEqual(1000);
      done();
    });
  });
});
