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

  it('should reject the promise with the error if an error occurs with a msg not equal to "cancelled"', function(done) {
    spyOn(prompt, 'get').andCallFake(function(schema, callback) {
      callback({ message: 'error happened' }, 1000);
    });
    promptUtil.prompt({}, {}).catch(function(value) {
      expect(value).toEqual({ message: 'error happened' });
      done();
    });
  });

  it('should reject the promise with false if an error occurs with msg canceled', function(done) {
    spyOn(prompt, 'get').andCallFake(function(schema, callback) {
      callback({ message: 'canceled' }, 1000);
    });
    promptUtil.prompt({}, {}).catch(function(value) {
      expect(value).toEqual(false);
      done();
    });
  });
});
