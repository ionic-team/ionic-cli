'use strict';

var fs = require('fs');
var rewire = require('rewire');
var IonicStats = rewire('../../lib/utils/stats');
var IonicInfoModule = rewire('ionic-app-lib').info;
var IonicAppLib = require('ionic-app-lib');
var log = IonicAppLib.logging.logger;

describe('Stats', function() {

  it('should have stats t method defined', function() {
    expect(IonicStats.t).toBeDefined();
  });

  describe('#t', function() {
    var oldprocessargv;

    beforeEach(function() {
      oldprocessargv = process.argv;
    });

    afterEach(function() {
      process.argv = oldprocessargv;
    });

    it('should not track if process.argv is less than 3', function(done) {
      process.argv = ['node', 'bin/ionic'];

      var mpSpy = jasmine.createSpy('mpSpy');
      var revertMpSpy = IonicStats.__set__('mp', mpSpy);

      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(true);

      var revertConfig = IonicStats.__set__('ionicConfig', configSpy);

      IonicStats.t().then(function() {
        expect(configSpy.get).not.toHaveBeenCalled();
        expect(mpSpy).not.toHaveBeenCalled();
        revertMpSpy();
        revertConfig();
        done();
      });
    });

    it('should not track stats if opted out', function(done) {
      process.argv = ['node', 'bin/ionic', 'start', 'foldername'];

      var mpSpy = jasmine.createSpy('mpSpy');
      var revertMpSpy = IonicStats.__set__('mp', mpSpy);

      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(true);

      var revertConfig = IonicStats.__set__('ionicConfig', configSpy);

      IonicStats.t().then(function() {
        expect(configSpy.get).toHaveBeenCalled();
        expect(mpSpy).not.toHaveBeenCalled();
        revertMpSpy();
        revertConfig();
        done();
      });
    });

    it('should catch errors thrown mp', function(done) {
      process.argv = ['node', 'bin/ionic', 'start', 'foldername'];

      spyOn(log, 'error');
      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);

      configSpy.get.andCallFake(function() {
        throw new Error('Fake Error');
      });

      var mpSpy = jasmine.createSpy('mpSpy');
      var revertMpSpy = IonicStats.__set__('mp', mpSpy);
      var revertConfig = IonicStats.__set__('ionicConfig', configSpy);

      IonicStats.t().then(function() {
        expect(configSpy.get).toHaveBeenCalled();
        expect(mpSpy).not.toHaveBeenCalled();
        expect(log.error).toHaveBeenCalled();
        revertMpSpy();
        revertConfig();
        done();
      });
    });

    it('should track the correct command', function(done) {
      process.argv = ['node', 'bin/ionic', 'update', 'foldername', '-w', 'android', 'ios'];

      spyOn(fs, 'readFileSync').andReturn('{ "version": "2.0.0-beta.25" }');

      var mpSpy = jasmine.createSpy('mpSpy');
      var revertMpSpy = IonicStats.__set__('mp', mpSpy);

      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(false);

      var revertConfig = IonicStats.__set__('ionicConfig', configSpy);

      IonicStats.t().then(function() {
        expect(mpSpy).toHaveBeenCalledWith('update', {
          ionic_version: '2.0.0-beta.25', // eslint-disable-line camelcase
          cli_version: '2.0.0-beta.25', // eslint-disable-line camelcase
          email: false,
          account_id: false, // eslint-disable-line camelcase
          /*
          os: 'Mac OS X El Capitan',
          gulp: 'v3.0.0',
          node: 'v5.10.1',
          */
          cli_release_tag: 'beta', // eslint-disable-line camelcase
          '--no-cordova': true,
          android: true,
          ios: true,
          platform: 'android,ios'
        });
        revertMpSpy();
        revertConfig();
        done();
      });
    });

    it('should track the correct command with no platforms or releaseTags', function(done) {
      process.argv = ['node', 'bin/ionic', 'update', 'foldername', '-w'];

      spyOn(fs, 'readFileSync').andReturn('{ "version": "2.0.0" }');

      var mpSpy = jasmine.createSpy('mpSpy');
      var revertMpSpy = IonicStats.__set__('mp', mpSpy);

      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(false);

      var revertConfig = IonicStats.__set__('ionicConfig', configSpy);

      IonicStats.t().then(function() {
        expect(mpSpy).toHaveBeenCalledWith('update', {
          ionic_version: '2.0.0', // eslint-disable-line camelcase
          cli_version: '2.0.0', // eslint-disable-line camelcase
          email: false,
          account_id: false, // eslint-disable-line camelcase
          /*
          os: 'Mac OS X El Capitan',
          gulp: 'v3.0.0',
          node: 'v5.10.1',
          */
          '--no-cordova': true
        });
        revertMpSpy();
        revertConfig();
        done();
      });
    });
  });

  describe('mp function', function() {
    it('should call track after getting unique Id from ionicConfig', function() {
      var configSpy = jasmine.createSpyObj('ionicConfig', ['get', 'set']);
      configSpy.get.andReturn('uniq121');

      var trackSpy = jasmine.createSpy('trackSpy');
      var revertTrackSpy = IonicStats.__set__('track', trackSpy);

      var revertConfig = IonicStats.__set__('ionicConfig', configSpy);
      var mp = IonicStats.__get__('mp');

      mp('update', {
        ionic_version: '2.0.0', // eslint-disable-line camelcase
        cli_version: '2.0.0', // eslint-disable-line camelcase
        email: false,
        account_id: false, // eslint-disable-line camelcase
        os: 'Mac OS X El Capitan',
        gulp: 'v3.0.0',
        node: 'v5.10.1',
        '--no-cordova': true
      });

      expect(configSpy.get).toHaveBeenCalled();
      expect(configSpy.set).not.toHaveBeenCalled();
      expect(trackSpy).toHaveBeenCalledWith('update', 'uniq121', {
        ionic_version: '2.0.0', // eslint-disable-line camelcase
        cli_version: '2.0.0', // eslint-disable-line camelcase
        email: false,
        account_id: false, // eslint-disable-line camelcase
        os: 'Mac OS X El Capitan',
        gulp: 'v3.0.0',
        node: 'v5.10.1',
        '--no-cordova': true
      }, jasmine.any(Function));
      revertTrackSpy();
      revertConfig();
    });

    it('should call track after getting unique Id from createId', function() {
      var configSpy = jasmine.createSpyObj('ionicConfig', ['get', 'set']);
      configSpy.get.andReturn(null);

      var createIdSpy = jasmine.createSpy('createIdSpy');
      createIdSpy.andReturn('uniq454');
      var revertCreateIdSpy = IonicStats.__set__('createId', createIdSpy);

      var trackSpy = jasmine.createSpy('trackSpy');
      var revertTrackSpy = IonicStats.__set__('track', trackSpy);

      var revertConfig = IonicStats.__set__('ionicConfig', configSpy);
      var mp = IonicStats.__get__('mp');

      mp('update', {
        ionic_version: '2.0.0', // eslint-disable-line camelcase
        cli_version: '2.0.0', // eslint-disable-line camelcase
        email: false,
        account_id: false, // eslint-disable-line camelcase
        os: 'Mac OS X El Capitan',
        gulp: 'v3.0.0',
        node: 'v5.10.1',
        '--no-cordova': true
      });

      expect(configSpy.get).toHaveBeenCalled();
      expect(configSpy.set).toHaveBeenCalled();
      expect(trackSpy).toHaveBeenCalledWith('update', 'uniq454', {
        ionic_version: '2.0.0', // eslint-disable-line camelcase
        cli_version: '2.0.0', // eslint-disable-line camelcase
        email: false,
        account_id: false, // eslint-disable-line camelcase
        os: 'Mac OS X El Capitan',
        gulp: 'v3.0.0',
        node: 'v5.10.1',
        '--no-cordova': true
      }, jasmine.any(Function));

      revertCreateIdSpy();
      revertTrackSpy();
      revertConfig();
    });
  });

  describe('track function', function() {
    it('should return a unique id', function() {
      var track = IonicStats.__get__('track');
      var requestSpy = jasmine.createSpy('requestSpy');
      requestSpy.andCallFake(function(options, callback) {
        callback(null, { code: 200 }, 'thumbs up');
      });
      var revertRequestSpy = IonicStats.__set__('request', requestSpy);


      track('update', 'uniq676', {
        ionic_version: '2.0.0' // eslint-disable-line camelcase
      }, function(err, res, body) {
        expect(requestSpy).toHaveBeenCalledWith({
          url: 'https://t.ionic.io/event/cli',
          method: 'POST',
          json: {
            _event: 'update',
            _uuid: 'uniq676',
            data: {
              ionic_version: '2.0.0' // eslint-disable-line camelcase
            }
          },
          proxy: null
        }, jasmine.any(Function));

        expect(err).toEqual(null);
        expect(res.code).toEqual(200);
        expect(body).toEqual('thumbs up');

        revertRequestSpy();
      });
    });
  });

  describe('createId function', function() {
    it('should return a unique id', function() {
      var createId = IonicStats.__get__('createId');
      var uniqueId = createId();
      var uniqueId2 = createId();

      expect(uniqueId).not.toEqual(uniqueId2);
    });
  });
});
