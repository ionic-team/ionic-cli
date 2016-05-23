var request = require('request'),
  IonicConfig = require('./config');

var proxy = process.env.PROXY || process.env.http_proxy || null;

var s = {
  track: function(event, uuid, data, callback) {
    var data = {
      '_event' : event,
      '_uuid': uuid,
      'data': data
    };

    request({
      url: 'https://t.ionic.io/event/cli',
      method: "POST",
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

      if(process.argv.length < 3) return;

      if( ionicConfig.get('statsOptOut') === true ) {
        return;
      }

      var cmdName = process.argv[2].toLowerCase();
      var cmdArgs = (process.argv.length > 3 ? process.argv.slice(3) : []); // skip the cmdName

      var statsData = additionalData || {};
      var platforms = [];
      var x, y, cmd;

      // update any aliases with the full cmd so there's a common property
      var aliasMap = {
        'rm': 'remove',
        'ls': 'list',
        'up': 'update',
        '-w': '--no-cordova',
        '-b': '--nobrowser',
        '-r': '--nolivereload',
        '-x': '--noproxy',
        '-l': '--livereload',
        '-c': '--consolelogs',
        '-s': '--serverlogs',
        '-n': '--no-email',
        '-s': '--sass'
      };
      for(x=0; x<cmdArgs.length; x++) {
        for(y in aliasMap) {
          if(cmdArgs[x].toLowerCase() == y) {
            cmdArgs[x] = aliasMap[y];
          }
        }
      }

      var platformWhitelist = 'android ios firefoxos wp7 wp8 amazon-fireos blackberry10 tizen'.split(' ');
      var argsWhitelist = 'add remove list update check debug release search --livereload --consolelogs --serverlogs --no-cordova --nobrowser --nolivereload --noproxy --no-email --debug --release --device --emulator --sass --splash --icon'.split(' ');

      // collect only certain args, skip over everything else
      for(x=0; x<cmdArgs.length; x++) {
        cmd = cmdArgs[x].toLowerCase();

        // gather what platforms this is targeting
        for(y=0; y<platformWhitelist.length; y++) {
          if(cmd == platformWhitelist[y]) {
            platforms.push(cmd); // group them together
            statsData[cmd] = true; // also give them their own property
            break;
          }
        }
        // gather only args that are in our list of valid stat args
        for(y=0; y<argsWhitelist.length; y++) {
          if(cmd == argsWhitelist[y]) {
            statsData[cmd] = true;
            break;
          }
        }
      }

      // create a platform property only when there is 1 or more
      if(platforms.length) {
        statsData.platform = platforms.sort().join(',');
      }

      // add which ionic lib version they're using
      try {
        statsData.ionic_version = require( path.resolve('www/lib/ionic/version.json') ).version;
      } catch(e2) {}

      // add which cli version is being used
      try {
        statsData.cli_version = require('../../package.json').version;
      } catch(e2) {}

      try {
        statsData.email = ionicConfig.get('email');
      } catch (e2) {}

      try {
        statsData.account_id = ionicConfig.get('id');
      } catch (e2) {}

      var releaseTag = statsData.cli_version.split('-')[1];
      if (releaseTag) {
        statsData.cli_release_tag = releaseTag.split('.')[0];
      }

      this.mp(cmdName, statsData);
      //console.log(cmdName, statsData);

    } catch(e) {
      console.log( ('Error stats: ' + e) );
    }
  },
  mp: function(e, d) {
    var unique_id = ionicConfig.get('ank');
    if(!unique_id) {
      this.createId();
      unique_id = ionicConfig.get('ank');
    }
    s.track(e, unique_id, d, function(err, data) {
    });
  },
  createId: function() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });

    ionicConfig.set('ank', uuid);
  }
};
