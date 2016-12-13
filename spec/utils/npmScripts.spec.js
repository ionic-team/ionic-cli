'use strict';

var rewire = require('rewire');
var optimist = require('optimist');
var path = require('path');
var fs = require('fs');
var npmScripts = rewire('../../lib/utils/npmScripts');
var Q = require('q');

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

describe('consolidate options', function() {
  var consolidateOptions = npmScripts.__get__('consolidateOptions');

  it('should consolidate options to the first array element', function() {
    var options = {
      _: ['run', 'ios'],
      consolelogs: false,
      c: true,
      serverlogs: false,
      s: true,
      debug: false,
      release: false,
      l: true,
      p: 8100,
      r: 6000,
      '$0': 'ionic',
      v2: true,
      runLivereload: true,
      isPlatformServe: true
    };
    var results = consolidateOptions(['port', 'p'], options);
    expect(results).toEqual({
      _: ['run', 'ios'],
      consolelogs: false,
      c: true,
      serverlogs: false,
      s: true,
      debug: false,
      release: false,
      l: true,
      port: 8100,
      r: 6000,
      '$0': 'ionic',
      v2: true,
      runLivereload: true,
      isPlatformServe: true
    });
  });

  it('should consolidate duplicates', function() {
    var options = {
      _: ['run', 'ios'],
      consolelogs: false,
      c: true,
      serverlogs: false,
      s: true,
      debug: false,
      release: false,
      l: true,
      p: 8100,
      port: 8100,
      r: 6000,
      '$0': 'ionic',
      v2: true,
      runLivereload: true,
      isPlatformServe: true
    };
    var results = consolidateOptions(['port', 'p'], options);
    expect(results).toEqual({
      _: ['run', 'ios'],
      consolelogs: false,
      c: true,
      serverlogs: false,
      s: true,
      debug: false,
      release: false,
      l: true,
      port: 8100,
      r: 6000,
      '$0': 'ionic',
      v2: true,
      runLivereload: true,
      isPlatformServe: true
    });
  });
});
describe('optionsToArray options', function() {
  var optionsToArray = npmScripts.__get__('optionsToArray');

  it('should convert argv options into an array', function() {
    var processArguments = ['node', 'ionic', 'run', 'ios', '--port', '8100', '--livereload'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var results = optionsToArray(argv);
    expect(results).toEqual([
      '--port', 8100,
      '--livereload',
    ]);
  });
});