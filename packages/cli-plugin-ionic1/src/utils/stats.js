/* eslint-disable camelcase, no-underscore-dangle */
'use strict';

var request = require('request');
var IonicAppLib = require('ionic-app-lib');
var IonicConfig = IonicAppLib.config;
var IonicInfo = IonicAppLib.info;
var log = IonicAppLib.logging.logger;
var path = require('path');
var fs = require('fs');

var proxy = process.env.PROXY || process.env.http_proxy || null;

function track(event, uuid, data, callback) {
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

var ionicConfig = IonicConfig.load();

function createId() {
  var d = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16);
  });
}

// update any aliases with the full cmd so there's a common property
function mapAliases(args) {
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

  return args.map(function(arg) {
    var lowerCaseArg = arg.toLowerCase();
    return (aliasMap[lowerCaseArg]) ? aliasMap[lowerCaseArg] : arg;
  });
}

function mp(e, d) {
  var uniqueId = ionicConfig.get('ank');
  if (!uniqueId) {
    uniqueId = createId();
    ionicConfig.set('ank', uniqueId);
  }
  track(e, uniqueId, d, function(err, data) { // eslint-disable-line no-unused-vars,handle-callback-err
  });
}

function t(additionalData) {
  return IonicInfo.gatherInfo().then(function(info) {
    return mainTrack(additionalData, info);
  });
}

function mainTrack(additionalData, info) {
  try {

    if (process.argv.length < 3) return;

    if (ionicConfig.get('statsOptOut') === true) {
      return;
    }

    var cmdName = process.argv[2].toLowerCase();
    var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []); // skip the cmdName

    var statsData = additionalData || {};
    var platforms = [];
    var filePath;
    var releaseTag;

    // update any aliases with the full cmd so there's a common property
    cmdArgs = mapAliases(cmdArgs);

    var platformWhitelist = 'android ios firefoxos wp7 wp8 amazon-fireos blackberry10 tizen'.split(' ');
    var argsWhitelist = ('add remove list update check debug release search --livereload --consolelogs --serverlogs ' +
      '--no-cordova --nobrowser --nolivereload --noproxy --no-email --debug --release --device --emulator --sass ' +
      '--splash --icon').split(' ');

    platforms = cmdArgs.filter(function(cmd) {
      return platformWhitelist.indexOf(cmd) !== -1;
    });

    // create a platform property only when there is 1 or more
    if (platforms.length) {
      statsData.platform = platforms.sort().join(',');
    }

    statsData = cmdArgs
      .filter(function(cmd) {
        return argsWhitelist.indexOf(cmd) !== -1;
      })
      .concat(platforms)
      .reduce(function(argObj, cmd) {
        argObj[cmd] = true;
        return argObj;
      }, statsData);

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

    if (statsData.cli_version) {
      releaseTag = statsData.cli_version.split('-')[1];
    }
    if (releaseTag) {
      statsData.cli_release_tag = releaseTag.split('.')[0];
    }

    mp(cmdName, ({
      os: info.os,
      gulp: info.gulp,
      node: info.node
    }, statsData));

    // console.log(cmdName, statsData);

  } catch (e) {
    log.error(('Error stats: ' + e));
  }
}

module.exports = {
  t: t
};
