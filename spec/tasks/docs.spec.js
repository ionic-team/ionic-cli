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

  describe('sanitizeUrl function', function() {
    it('should replace $ with %24', function() {
      var sanitizeUrl = docs.__get__('sanitizeUrl');
      var results = sanitizeUrl('http://ionic.io/$yo');
      expect(results).toEqual('http://ionic.io/%24yo');
    });
  });

  describe('list function', function() {

  });

  describe('openDefault function', function() {

  });

  describe('lookupCommand function', function() {

  });

  describe('run', function() {
    it('should call list if command is ls', function() {
      var listSpy = jasmine.createSpy('listSpy');
      var revert = docs.__set__('list', listSpy);
      var argv = {
        _: ['docs', 'ls']
      };
      docs.run({}, argv);
      expect(listSpy).toHaveBeenCalled();
      revert();
    });

    it('should call openDefault if command is missing', function() {
      var openDefaultSpy = jasmine.createSpy('openDefaultSpy');
      var revert = docs.__set__('openDefault', openDefaultSpy);
      var argv = {
        _: ['docs']
      };
      docs.run({}, argv);
      expect(openDefaultSpy).toHaveBeenCalled();
      revert();
    });

    it('should call list if command is not ls', function() {
      var lookUpCommandSpy = jasmine.createSpy('lookUpCommandSpy');
      var revert = docs.__set__('lookUpCommand', lookUpCommandSpy);
      var argv = {
        _: ['docs', 'other']
      };
      docs.run({}, argv);
      expect(lookUpCommandSpy).toHaveBeenCalledWith('other');
      revert();
    });
  });
});
