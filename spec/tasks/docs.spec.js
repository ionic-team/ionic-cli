'use strict';

var rewire = require('rewire');
var docs = rewire('../../lib/ionic/docs');

describe('docs command', function() {
  describe('command settings', function() {

    it('should have a title', function() {
      expect(docs.title).toBeDefined();
      expect(docs.title).not.toBeNull();
      expect(docs.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(docs.summary).toBeDefined();
      expect(docs.summary).not.toBeNull();
      expect(docs.summary.length).toBeGreaterThan(0);
    });

    it('should have a set of options with boolean defaults to true', function() {
      expect(docs.options).not.toEqual(jasmine.any(Object));
    });
  });

  describe('list function', function() {
    var list = docs.__get__('list');

  });

  describe('openDefault function', function() {
    var openDefault = docs.__get__('list');

  });

  describe('lookupCommand function', function() {
    var lookupCommand = docs.__get__('list');

  });
});
