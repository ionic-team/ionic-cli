'use strict';

var fs = require('fs');
var IonicStore = require('../../lib/utils/store');

describe('IonicStore', function() {

  describe('IonicStore Constructor homedir', function() {
    it('IonicStore should use HOME env variable first', function() {
      process.env.HOME = '/home/ionicuser';
      process.env.USERPROFILE = '/home/ionicuser1';
      process.env.HOMEPATH = '/home/ionicuser2';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');

      var store = new IonicStore('myfilename');

      expect(store.homeDir).toEqual('/home/ionicuser');
    });

    it('IonicStore should use HOME env variable second', function() {
      delete process.env.HOME;
      process.env.USERPROFILE = '/home/ionicuser1';
      process.env.HOMEPATH = '/home/ionicuser2';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');

      var store = new IonicStore('myfilename');

      expect(store.homeDir).toEqual('/home/ionicuser1');
    });

    it('IonicStore should use HOME env variable third', function() {
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      process.env.HOMEPATH = '/home/ionicuser2';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');

      var store = new IonicStore('myfilename');

      expect(store.homeDir).toEqual('/home/ionicuser2');
    });
  });

  describe('constructor values', function() {
    it('should load file provided to constructor', function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');

      var store = new IonicStore('myfilename');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(store.fileName).toEqual('myfilename.data');
      expect(store.homeDir).toEqual('/home/ionicuser');
      expect(store.privateDir).toEqual('/home/ionicuser/.ionic');
      expect(store.filePath).toEqual('/home/ionicuser/.ionic/myfilename.data');
      expect(store.data).toEqual({
        file: 'store'
      });
    });

    it('should create the privateDir if it does not exist', function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(false);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');

      var store = new IonicStore('myfilename.json');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/home/ionicuser/.ionic');
      expect(store.fileName).toEqual('myfilename.json');
      expect(store.homeDir).toEqual('/home/ionicuser');
      expect(store.privateDir).toEqual('/home/ionicuser/.ionic');
      expect(store.filePath).toEqual('/home/ionicuser/.ionic/myfilename.json');
      expect(store.data).toEqual({
        file: 'store'
      });
    });

    it('should keep filename intact if it contains a dot', function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');

      var store = new IonicStore('myfilename.json');

      expect(store.fileName).toEqual('myfilename.json');
      expect(store.homeDir).toEqual('/home/ionicuser');
      expect(store.privateDir).toEqual('/home/ionicuser/.ionic');
      expect(store.filePath).toEqual('/home/ionicuser/.ionic/myfilename.json');
      expect(store.data).toEqual({
        file: 'store'
      });
    });

    it('should end early if no filename provided', function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');

      var store = new IonicStore();

      expect(store.fileName).toBeUndefined();
      expect(store.homeDir).toBeUndefined();
      expect(store.privateDir).toBeUndefined();
      expect(store.filePath).toBeUndefined();
      expect(store.data).toEqual({});
    });
  });

  describe('get function', function() {
    var store;
    beforeEach(function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');
      store = new IonicStore('myfilename');
    });

    it('should return the stored value if it exists', function() {
      var result = store.get('file');
      expect(result).toEqual('store');
    });

    it('should return undefined if the value does not exists', function() {
      var result = store.get('file2');
      expect(result).toBeUndefined();
    });
    it('should return the entire store if no value is passed', function() {
      var result = store.get();
      expect(result).toEqual({ file: 'store' });
    });
  });

  describe('set function', function() {
    var store;
    beforeEach(function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');
      store = new IonicStore('myfilename');
    });

    it('should update the keys value if the key exists', function() {
      store.set('file', 'newval');
      expect(store.get('file')).toEqual('newval');
    });

    it('should create the keys value if the key does not exist', function() {
      store.set('newfile', 'newval');
      expect(store.get('newfile')).toEqual('newval');
    });
  });

  describe('save function', function() {
    var store;
    beforeEach(function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');
      store = new IonicStore('myfilename');
    });

    it('should return the stored value if it exists', function() {
      spyOn(fs, 'writeFileSync');
      store.save();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/home/ionicuser/.ionic/myfilename.data',
        '{\n  "file": "store"\n}'
      );
    });
    it('should return the stored value if it exists', function() {
      spyOn(console, 'error');
      spyOn(fs, 'writeFileSync').andCallFake(function() {
        throw new Error('error');
      });
      store.save();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('remove function', function() {
    var store;
    beforeEach(function() {
      process.env.HOME = '/home/ionicuser';
      spyOn(fs, 'existsSync').andReturn(true);
      spyOn(fs, 'mkdirSync');
      spyOn(fs, 'readFileSync').andReturn('{ "file": "store" }');
      store = new IonicStore('myfilename');
    });

    it('should key and value if the key exists', function() {
      store.remove('file');
      expect(store.get('file')).toBeUndefined();
    });
    it('should not throw an error if the key/value being removed does not exist', function() {
      store.remove('file2');
      expect(store.get('file2')).toBeUndefined();
    });
  });
});
