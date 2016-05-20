/* eslint-disable camelcase, no-underscore-dangle */

var extend = Object.assign || require('util')._extend; // eslint-disable-line no-underscore-dangle
var request = require('request');
var IonicConfig = require('ionic-app-lib').config;
var IonicInfo = require('ionic-app-lib').info;
var path = require('path');
var fs = require('fs');

var proxy = process.env.PROXY || process.env.http_proxy || null;

var s = {
  track: function(event, uuid, data, callback) {
    data = {
      _event : event,
      _uuid: uuid,
      data: data
    };

    request({
      url: 'https://t.ionic.io/event/cli',
      method: 'POST',
      json: data,
      proxy: proxy
    }, function(err, res, body) {
      callback(err, res, body);
    });
  }
};

var ionicConfig = IonicConfig.load();

exports.IonicStats = {
  t: function(additionalData) {
    try {

      if (process.argv.length < 3) return;

      if (ionicConfig.get('statsOptOut') === true) {
        return;
      }

      var cmdName = process.argv[2].toLowerCase();
      var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []); // skip the cmdName

      var statsData = additionalData || {};
      var platforms = [];
      var x;
      var y;
      var cmd;
      var filePath;

      // update any aliases with the full cmd so there's a common property
      var aliasMap = {
        rm: 'remove',
        ls: 'list',
        up: 'update',
        '-w': '--no-cordova',
        '-b': '--nobrowser',
        '-r': '--nolivereload',
        '-x': '--noproxy',
        '-l': '--livereload',
        '-c': '--consolelogs',
        '-s': '--serverlogs',
        '-n': '--no-email'
      };
      for (x = 0; x < cmdArgs.length; x += 1) {
        for (y in aliasMap) {
          if (cmdArgs[x].toLowerCase() === y) {
            cmdArgs[x] = aliasMap[y];
          }
        }
      }

      var platformWhitelist = 'android ios firefoxos wp7 wp8 amazon-fireos blackberry10 tizen'.split(' ');
      var argsWhitelist = 'add remove list update check debug release search --livereload --consolelogs --serverlogs ' +
        '--no-cordova --nobrowser --nolivereload --noproxy --no-email --debug --release --device --emulator --sass ' +
        '--splash --icon'.split(' ');

      // collect only certain args, skip over everything else
      for (x = 0; x < cmdArgs.length; x += 1) {
        cmd = cmdArgs[x].toLowerCase();

        // gather what platforms this is targeting
        for (y = 0; y < platformWhitelist.length; y += 1) {
          if (cmd === platformWhitelist[y]) {
            platforms.push(cmd); // group them together
            statsData[cmd] = true; // also give them their own property
            break;
          }
        }

        // gather only args that are in our list of valid stat args
        for (y = 0; y < argsWhitelist.length; y += 1) {
          if (cmd === argsWhitelist[y]) {
            statsData[cmd] = true;
            break;
          }
        }
      }

      // create a platform property only when there is 1 or more
      if (platforms.length) {
        statsData.platform = platforms.sort().join(',');
      }

      // add which ionic lib version they're using
      try {
        filePath = path.resolve('www/lib/ionic/version.json');
        statsData.ionic_version = JSON.parse(fs.readFileSync(filePath)).version;
      } catch (e2) {} // eslint-disable-line no-empty

      // add which cli version is being used
      try {
        filePath = '../../package.json';
        statsData.cli_version = JSON.parse(fs.readFileSync(filePath)).version;
      } catch (e2) {} // eslint-disable-line no-empty

      try {
        statsData.email = ionicConfig.get('email');
      } catch (e2) {} // eslint-disable-line no-empty

      try {
        statsData.account_id = ionicConfig.get('id');
      } catch (e2) {} // eslint-disable-line no-empty

      var releaseTag = statsData.cli_version.split('-')[1];
      if (releaseTag) {
        statsData.cli_release_tag = releaseTag.split('.')[0];
      }

      var info = {};
      IonicInfo.getNodeVersion(info);
      IonicInfo.getOsEnvironment(info);
      IonicInfo.gatherGulpInfo(info);

      this.mp(cmdName, extend({}, statsData, {
        os: info.os,
        gulp: info.gulp,
        node: info.node
      }));

      // console.log(cmdName, statsData);

    } catch (e) {
      console.log(('Error stats: ' + e));
    }
  },
  mp: function(e, d) {
    var uniqueId = ionicConfig.get('ank');
    if (!uniqueId) {
      this.createId();
      uniqueId = ionicConfig.get('ank');
    }
    s.track(e, uniqueId, d, function(err, data) { // eslint-disable-line no-unused-vars,handle-callback-err
    });
  },
  createId: function() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });

    ionicConfig.set('ank', uuid);
  }
};
