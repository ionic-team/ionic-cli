var Q = require('q'),
    // IonicStats = require('../lib/ionic/stats').IonicStats,
    IonicStatsModule,
    IonicStats,
    IonicConfig = require('../lib/ionic/config'),
    path = require('path'),
    rewire = require('rewire');

describe('Stats', function() {
  beforeEach(function() {
    IonicStatsModule = rewire('../lib/ionic/stats');
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

      var configSpy = createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(true);

      IonicStatsModule.__set__('ionicConfig', configSpy);

      IonicStats.t();

      expect(configSpy.get).not.toHaveBeenCalled();
      expect(IonicStats.mp).not.toHaveBeenCalled();
      process.argv = oldprocessargv;
    });

    it('should not track stats if opted out', function() {
      var configSpy = createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(true);
      spyOn(IonicStatsModule, 'getVersion').andReturn({version: '1.6.4'});

      IonicStatsModule.__set__('ionicConfig', configSpy);

      IonicStats.t();

      expect(configSpy.get).toHaveBeenCalled();
    });

    it('should track the correct command', function() {
      var oldprocessargv = process.argv;
      process.argv = ['node', 'bin/ionic', 'start', 'foldername'];
      var packageJson = { version: '1.6.4' };

      spyOn(IonicStats, 'mp');
      spyOn(IonicStatsModule, 'getVersion').andReturn(packageJson);

      var configSpy = createSpyObj('ionicConfig', ['get']);
      configSpy.get.andReturn(false);

      IonicStatsModule.__set__('ionicConfig', configSpy);

      IonicStats.t();

      expect(IonicStats.mp).toHaveBeenCalledWith('start', { cli_version: packageJson.version, email: false, account_id: false });
      process.argv = oldprocessargv;
    });
  });
});
