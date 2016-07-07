'use strict';

var path = require('path');
var _ = require('underscore');
var extend = require('../utils/extend');
var Q = require('q');
var moment = require('moment');
var expandTilde = require('expand-tilde');
var ProgressBar = require('progress');
var IonicAppLib = require('ionic-app-lib');
var fail = IonicAppLib.utils.fail;
var Login = IonicAppLib.login;
var log = IonicAppLib.logging.logger;
var Package = IonicAppLib.package;
var LoginTask = require('./login');
var Table = require('../utils/table');

var Project = IonicAppLib.project;

var settings = {
  title: 'package',
  name: 'package',
  summary: 'Use Ionic Package to build your app ' + '(alpha)'.red,
  args: {
    '<command>': 'build android'.yellow + ', ' + 'build ios'.yellow +
      ', ' + 'list'.yellow + ', ' + 'info'.yellow + ', or ' + 'download'.yellow,
    '[options]': ''
  },
  options: {
    '--release': '(' + 'build <platform>'.yellow +
      ') Mark this build as a release',
    '--profile|-p <tag>': '(' + 'build <platform>'.yellow +
      ') Specify the Security Profile to use with this build',
    '--noresources': '(' + 'build <platform>'.yellow +
      ') Do not generate icon and splash screen resources during this build',
    '--destination|-d <path>': '(' + 'download'.yellow +
      ') Specify the destination directory to download your packaged app.'
  },
  module: './ionic/package',
  isProjectTask: true
};

function run(ionic, argv) {
  var cmd;

  if (argv._.length < 2) {
    cmd = 'list';
  } else {
    cmd = argv._[1];
  }

  var dir = null;
  var project = null;
  var appId = null;

  try {
    dir = process.cwd();
    project = Project.load(dir);
    appId = project.get('app_id');

    if (!appId) {
      throw new Error('Missing Ionic App ID.');
    }
  } catch (ex) {
    return fail(ex, 'package');
  }

  switch (cmd) {
  case 'build':
    return packageBuild(ionic, argv, dir, project, appId);
  case 'list':
    return packageList(ionic, argv, dir, project, appId);
  case 'info':
    return packageInfo(ionic, argv, dir, project, appId);
  case 'download':
    return packageDownload(ionic, argv, dir, project, appId);
  }

  return fail("Unknown subcommand '" + cmd + "'.", 'package');
}

function packageBuild(ionic, argv, dir, project, appId) {

  if (argv._.length < 3) {
    return fail('Specify a valid platform (android or ios).', 'package');
  }

  var jar;
  var platform = argv._[2];
  var buildMode = argv.release ? 'release' : 'debug';

  if (!_.contains(['android', 'ios'], platform)) {
    return fail("Invalid platform '" + platform + "', please choose either 'android' or 'ios'.", 'package');
  }

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        log.info('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      var options = {};
      jar = j;

      if (typeof argv.p !== 'undefined') {
        argv.profile = argv.p;
      }

      if (typeof argv.noresources !== 'undefined') {
        options.noresources = true;
      }

      if (platform === 'android') {
        if (buildMode === 'debug') {
          return Package.buildAndroidDebug(dir, jar, appId, options);
        } else if (buildMode === 'release') {
          if (typeof argv.profile === 'undefined') {
            return fail('Must specify security profile for android release builds (--profile <tag>).', 'package');
          }

          return Package.buildAndroidRelease(dir, jar, appId, argv.profile, options);
        }
      } else if (platform === 'ios') {
        if (typeof argv.profile === 'undefined') {
          return fail('Must specify security profile for ios builds (--profile <tag>).', 'package');
        }

        return Package.buildIOS(dir, jar, appId, argv.profile, buildMode, options);
      }

      return Q.reject('Unrecognized platform/build mode.');
    })
    .catch(function(ex) {
      fail(ex, 'package');
    });
}

function formatStatus(status) {
  switch (status) {
  case 'SUCCESS':
    return status.green;
  case 'FAILED':
    return status.red;
  }

  return status;
}

function formatDate(date) {
  var d = new Date(date);

  return moment(d).format('MMM Do, YYYY H:mm:ss');
}

function packageList(ionic, argv, dir, project, appId) {

  var limit = 25;

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        log.info('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(jar) {
      return Package.listBuilds(appId, jar);
    })
    .then(function(body) {
      if (body.data.length === 0) {
        log.info('You don\'t have any builds yet!');
        log.info('Type ' + 'ionic help package'.yellow + ' to learn how to use Ionic Package.');
      } else {
        var count = 0;
        var headers = ['id', 'status', 'platform', 'mode'];
        var table;
        var screenWidth = process.stdout.getWindowSize()[0];

        if (screenWidth > 100) {
          headers.push('started');
        }

        if (screenWidth > 125) {
          headers.push('finished');
        }

        table = new Table({ head: headers });

        _.each(body.data.slice(0, limit), function(build) {
          count += 1;

          var row = [
            build.id,
            formatStatus(build.status),
            build.platform,
            build.mode
          ];

          if (screenWidth > 100) {
            row.push(formatDate(build.created));
          }

          if (screenWidth > 125) {
            row.push(build.completed ? formatDate(build.completed) : '');
          }

          table.push(row);
        });

        log.info('');
        log.info(table.toString());
        log.info('\nShowing', String(count).yellow, 'of your latest builds.');
        log.info('');
      }
    })
    .catch(function(ex) {
      fail(ex, 'package');
    });

}

function packageInfo(ionic, argv, dir, project, appId) {

  var jar;

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        log.info('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      jar = j;

      if (argv._.length < 3) {
        return Package.listBuilds(appId, jar);
      }

      return { data: [{ id: argv._[2] }] };
    })
    .then(function(body) {
      return Package.getBuild(appId, jar, body.data[0].id, { fields: ['output'] });
    })
    .then(function(body) {
      var table = new Table();
      var build = body.data;

      table.push(
        ['id'.yellow, build.id],
        ['status'.yellow, formatStatus(build.status)],
        ['platform'.yellow, build.platform],
        ['mode'.yellow, build.mode],
        ['started'.yellow, formatDate(build.created)]
      );

      if (build.completed) {
        table.push(['completed'.yellow, formatDate(build.completed)]);
      }

      log.info('');
      log.info(table.toString());
      log.info('');

      if (build.output) {
        log.info('output'.yellow + ':');
        log.info('');
        log.info(build.output);
        log.info('');
      }

    })
    .catch(function(ex) {
      fail(ex, 'package');
    });
}

function packageDownload(ionic, argv, dir, project, appId) {

  var jar;
  var bar;
  var downloadDirectory;

  if (typeof argv.d !== 'undefined') {
    argv['destination'] = argv.d;
  }

  if (typeof argv['destination'] === 'undefined') {
    downloadDirectory = dir;
  } else {
    downloadDirectory = path.resolve(expandTilde(argv['destination']));
  }

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        log.info('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      jar = j;

      if (argv._.length < 3) {
        return Package.listBuilds(appId, jar);
      }

      return { data: [{ id: argv._[2] }] };
    })
    .then(function(body) {
      return Package.downloadBuild(appId, jar, body.data[0].id, downloadDirectory);
    })
    .then(function(filename) {
      if (typeof bar !== 'undefined') {
        bar.tick(bar.total);
      }

      log.info('Wrote:', filename);
      log.info('Done!'.green);
    }, null, function(state) {
      if (typeof bar === 'undefined') {
        bar = new ProgressBar('Downloading... [:bar]  :percent  :etas', {
          complete: '=',
          incomplete: ' ',
          width: 30,
          total: state.total
        });
      }

      bar.tick(state.received);
    })
    .catch(function(ex) {
      fail(ex);
    });

}

module.exports = extend(settings, {
  run: run
});
