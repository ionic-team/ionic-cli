var IonicStatsModule;
var IonicInfoModule;
var IonicStats;
var fs = require('fs');
var rewire = require('rewire');

describe('Stats', function() {
  beforeEach(function() {
    IonicStatsModule = rewire('../../lib/utils/stats');
    IonicInfoModule = rewire('ionic-app-lib').info;
    IonicStats = IonicStatsModule.IonicStats;
  });

  it('should have stats defined', function() {
    expect(IonicStats).toBeDefined();
  });

  describe('#t', function() {
    it('should not track if process.argv is less than 3', function() {
      var oldprocessargv = process.argv;
      process.argv = ['node', 'bin/ionic'];

      spyOn(IonicStats, 'mp');

      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(true);

      var revertConfig = IonicStatsModule.__set__('ionicConfig', configSpy);

      IonicStats.t();

      expect(configSpy.get).not.toHaveBeenCalled();
      expect(IonicStats.mp).not.toHaveBeenCalled();
      process.argv = oldprocessargv;
      revertConfig();
    });

    it('should not track stats if opted out', function() {
      var oldprocessargv = process.argv;
      process.argv = ['node', 'bin/ionic', 'start', 'foldername'];
      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(true);

      var revertConfig = IonicStatsModule.__set__('ionicConfig', configSpy);

      IonicStats.t();

      expect(configSpy.get).toHaveBeenCalled();
      process.argv = oldprocessargv;
      revertConfig();
    });

    it('should track the correct command', function() {
      var oldprocessargv = process.argv;
      process.argv = ['node', 'bin/ionic', 'start', 'foldername'];
      spyOn(fs, 'readFileSync').andReturn('{ "version": "2.0.0-beta.25" }');

      spyOn(IonicStats, 'mp');
      spyOn(IonicInfoModule, 'getNodeVersion');
      spyOn(IonicInfoModule, 'getOsEnvironment');
      spyOn(IonicInfoModule, 'gatherGulpInfo').andCallFake(function(info) {
        info.os = 'Mac OS X El Capitan';
        info.node = 'v5.10.1';
        info.gulp = 'v3.0.0';
      });

      var configSpy = jasmine.createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(false);

      var revertConfig = IonicStatsModule.__set__('ionicConfig', configSpy);

      IonicStats.t();

      expect(IonicStats.mp).toHaveBeenCalledWith('start', {
        ionic_version: '2.0.0-beta.25', // eslint-disable-line camelcase
        cli_version: '2.0.0-beta.25', // eslint-disable-line camelcase
        email: false,
        account_id: false, // eslint-disable-line camelcase
        os: 'Mac OS X El Capitan',
        gulp: 'v3.0.0',
        node: 'v5.10.1',
        cli_release_tag: 'beta' // eslint-disable-line camelcase
      });
      process.argv = oldprocessargv;
      revertConfig();
    });
  });
});
