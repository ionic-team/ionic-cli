'use strict';

var rewire = require('rewire');
var path = require('path');
var fs = require('fs');
var npmScripts = rewire('../../lib/utils/npmScripts');
var EventEmitter = require('events');
var Q = require('q');
var spawn = require('cross-spawn-async');

describe('hasIonicScript function', function() {
  
  it('should return false if script does not exist', function(done) {
    var jsonContent = require(path.join(__dirname, '../', 'fixtures/', 'package.json'));
    var getPackageJsonContentsSpy = jasmine.createSpy('getPackageJsonContentsSpy').andReturn(Q(jsonContent));
    var revert = npmScripts.__set__('getPackageJsonContents', getPackageJsonContentsSpy);
    spyOn(npmScripts, 'getPackageJsonContents').andReturn(Q(jsonContent));

    npmScripts.hasIonicScript('stuff').then(function(results) {
      expect(results).toEqual(false);
      done();
      revert();
    });
  });
  it('should return true if script does not exist', function(done) {
    var jsonContent = require(path.join(__dirname, '../', 'fixtures/', 'package.json'));
    var getPackageJsonContentsSpy = jasmine.createSpy('getPackageJsonContentsSpy').andReturn(Q(jsonContent));
    var revert = npmScripts.__set__('getPackageJsonContents', getPackageJsonContentsSpy);
    spyOn(npmScripts, 'getPackageJsonContents').andReturn(Q(jsonContent));

    npmScripts.hasIonicScript('build').then(function(results) {
      expect(results).toEqual(true);
      done();
      revert();
    });
  });
});
/*
describe('runIonicScript function', function() {
  it('should call spawn', function(done) {
    //'npm', ['run', scriptName].concat(argv || []), { stdio: 'inherit' }
    var emitter = new EventEmitter();
    var error = new Error();

    spawn = jasmine.createSpy('spawnSpy', spawn).andCallFake(function() {
      return emitter;
    });

    npmScripts.runIonicScript('test').catch(function(err) {
      expect(err).toEqual(error);
      done();
    });
    emitter.emit('error', error);
  });
});
*/
describe('getPackageJsonContents method', function() {
  it('getPackageJsonContents should return json contents of package.json file and should memoize', function(done) {
    var dapath = path.join(__dirname, '../', 'fixtures/package.json');
    spyOn(path, 'resolve').andReturn(dapath);
    spyOn(fs, 'readFile').andCallThrough();

    npmScripts.getPackageJsonContents().then(function(contents) {
      expect(contents).toEqual(require(dapath));

      npmScripts.getPackageJsonContents().then(function(secondContents) {
        expect(secondContents).toEqual(require(dapath));
        expect(fs.readFile.calls.length).toEqual(1);
        done();
      });
    });
  });
});