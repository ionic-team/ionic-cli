'use strict';

var rewire = require('rewire');
var childProcess = require('child_process');
var bowerUtils = rewire('../../lib/utils/bower');
var fs = require('fs');
var path = require('path');
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;

describe('setIonicVersion function', function() {
  it('should get bower file data, and add devDependencies if they dont exist and write back', function() {
    spyOn(bowerUtils, 'getData').andReturn({
      name: 'HelloIonic',
      stuff: 'things',
      private: 'true'
    });
    spyOn(bowerUtils, 'saveData');

    bowerUtils.setIonicVersion('2.0.0');

    expect(bowerUtils.getData).toHaveBeenCalled();
    expect(bowerUtils.saveData).toHaveBeenCalledWith({
      name: 'HelloIonic',
      stuff: 'things',
      private: 'true',
      devDependencies: {
        ionic: 'driftyco/ionic-bower#2.0.0'
      }
    });
  });

  it('should get bower file data, and update devDependencies if they do exist and write back', function() {
    spyOn(bowerUtils, 'getData').andReturn({
      name: 'HelloIonic',
      stuff: 'things',
      private: 'true',
      devDependencies: {
        ionic: 'driftyco/ionic-bower#2.0.0',
        bootstrap: 'twbs/bootstrap#3.3.6'
      }
    });
    spyOn(bowerUtils, 'saveData');

    bowerUtils.setIonicVersion('2.1.0');

    expect(bowerUtils.getData).toHaveBeenCalled();
    expect(bowerUtils.saveData).toHaveBeenCalledWith({
      name: 'HelloIonic',
      stuff: 'things',
      private: 'true',
      devDependencies: {
        ionic: 'driftyco/ionic-bower#2.1.0',
        bootstrap: 'twbs/bootstrap#3.3.6'
      }
    });
  });
});

describe('setAppName function', function() {
  it('should get bower file and then write name back to bower file', function() {
    var newName = 'New Name';

    spyOn(bowerUtils, 'getData').andReturn({
      name: 'HelloIonic',
      stuff: 'things',
      private: 'true'
    });
    spyOn(bowerUtils, 'saveData');

    bowerUtils.setAppName(newName);

    expect(bowerUtils.getData).toHaveBeenCalled();
    expect(bowerUtils.saveData).toHaveBeenCalledWith({
      name: newName,
      stuff: 'things',
      private: 'true'
    });
  });
});

describe('getData function', function() {
  it('should return default values if the bower file is not found', function() {
    var defaults = {
      name: 'HelloIonic',
      private: 'true'
    };

    var result = bowerUtils.getData();
    expect(result).toEqual(defaults);
  });

  it('should throw an error if the bower file is found but malformed', function() {

    spyOn(fs, 'existsSync').andReturn(true);
    spyOn(bowerUtils, 'getData').andCallThrough();
    spyOn(fs, 'readFileSync').andReturn('{ "hi": "I am broken}');
    try {
      bowerUtils.getData();
    } catch (e) {} // eslint-disable-line no-empty

    expect(bowerUtils.getData).toThrow();
  });

  it('should return contents of the project bower.json file', function() {
    var json = {
      name: 'bowerFile',
      private: 'true'
    };
    spyOn(fs, 'existsSync').andReturn(true);
    spyOn(bowerUtils, 'getData').andCallThrough();
    spyOn(fs, 'readFileSync').andReturn(JSON.stringify(json));
    var results = bowerUtils.getData();

    expect(results).toEqual(json);
  });
});

describe('saveData function', function() {
  it('should save bower data to file', function() {
    var bowerFilePath = '/path/to/bower/bower.json';
    var json = {
      name: 'bowerFile',
      private: 'true'
    };
    spyOn(path, 'resolve').andReturn(bowerFilePath);
    spyOn(fs, 'writeFileSync');

    bowerUtils.saveData(json);
    expect(fs.writeFileSync).toHaveBeenCalledWith(bowerFilePath, JSON.stringify(json, null, 2));
  });

  it('should write an error to console if error occurs during write', function() {
    var bowerFilePath = '/path/to/bower/bower.json';
    var json = {
      name: 'bowerFile',
      private: 'true'
    };
    spyOn(path, 'resolve').andReturn(bowerFilePath);
    spyOn(log, 'error');
    spyOn(fs, 'writeFileSync').andCallFake(function() {
      throw new Error('error occurred');
    });

    bowerUtils.saveData(json);
    expect(log.error).toHaveBeenCalled();
  });
});

describe('checkForBower function', function() {
  it('should return true if bower is installed', function() {
    spyOn(childProcess, 'execSync').andReturn('1.7.9\n');
    var result = bowerUtils.checkForBower();
    expect(result).toEqual(true);
  });
  it('should return true if bower is installed', function() {
    spyOn(childProcess, 'execSync').andReturn('0');
    var result = bowerUtils.checkForBower();
    expect(result).toEqual(true);
  });

  it('should return false if bower exec returns "command not found"', function() {
    spyOn(childProcess, 'execSync').andReturn('command not found');
    var result = bowerUtils.checkForBower();
    expect(result).toEqual(false);
  });

  it('should return false if bower exec returns "not recognized"', function() {
    spyOn(childProcess, 'execSync').andReturn('not recognized');
    var result = bowerUtils.checkForBower();
    expect(result).toEqual(false);
  });

  it('should return false if bower exec throws an error', function() {
    spyOn(childProcess, 'execSync').andCallFake(function() {
      throw new Error('something happened');
    });
    var result = bowerUtils.checkForBower();
    expect(result).toEqual(false);
  });
});
