var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    Q = require('q'),
    moment = require('moment'),
    expandTilde = require('expand-tilde'),
    ProgressBar = require('progress'),
    IonicAppLib = require('ionic-app-lib'),
    Utils = IonicAppLib.utils,
    Login = IonicAppLib.login,
    Package = IonicAppLib.package,
    LoginTask = require('./login'),
    Table = require('./table'),
    Task = require('./task').Task;

var Project = IonicAppLib.project;
var IonicTask = function() {};

IonicTask.prototype = new Task();

IonicTask.prototype.run = function(ionic, argv) {

  var cmd;

  if (argv._.length < 2) {
    cmd = 'list';
  } else {
    cmd = argv._[1];
  }

  var dir = null,
      project = null,
      appId = null;

  try {
    dir = process.cwd();
    project = Project.load(dir);
    appId = project.get('app_id');

    if (!appId) {
      throw new Error('Missing Ionic App ID.');
    }
  } catch (ex) {
    return Utils.fail(ex, 'package');
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

  return Utils.fail("Unknown subcommand '" + cmd + "'.", 'package')

};

function packageBuild(ionic, argv, dir, project, appId) {

  if (argv._.length < 3) {
    return Utils.fail("Specify a valid platform (android or ios).", 'package');
  }

  var jar,
      platform = argv._[2],
      buildMode = argv.release ? 'release' : 'debug';

  if (!_.contains(['android', 'ios'], platform)) {
    return Utils.fail("Invalid platform '" + platform + "', please choose either 'android' or 'ios'.", 'package');
  }

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        console.log('No previous login existed. Attempting to log in now.');
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
            return Utils.fail("Must specify security profile for android release builds (--profile <tag>).", 'package');
          }

          return Package.buildAndroidRelease(dir, jar, appId, argv.profile, options);
        }
      } else if (platform === 'ios') {
        if (typeof argv.profile === 'undefined') {
          return Utils.fail("Must specify security profile for ios builds (--profile <tag>).", 'package');
        }

        return Package.buildIOS(dir, jar, appId, argv.profile, buildMode, options);
      }

      return Q.reject('Unrecognized platform/build mode.');
    })
    .catch(function(ex) {
      Utils.fail(ex, 'package');
    });

};

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
        console.log('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(jar) {
      return Package.listBuilds(appId, jar);
    })
    .then(function(body) {
      if (body.data.length === 0) {
        console.log('You don\'t have any builds yet!');
        console.log('Type ' + 'ionic help package'.yellow + ' to learn how to use Ionic Package.');
      } else {
        var count = 0,
            headers = ['id', 'status', 'platform', 'mode'],
            table,
            screenWidth = process.stdout.getWindowSize()[0];

        if (screenWidth > 100) {
          headers.push('started');
        }

        if (screenWidth > 125) {
          headers.push('finished');
        }

        table = new Table({ head: headers });

        _.each(body.data.slice(0, limit), function(build) {
          count++;

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

        console.log('');
        console.log(table.toString());
        console.log('\nShowing', String(count).yellow, 'of your latest builds.');
        console.log('');
      }
    })
    .catch(function(ex) {
      Utils.fail(ex, 'package');
    });

}

function packageInfo(ionic, argv, dir, project, appId) {

  var jar;

  return Login.retrieveLogin()
    .then(function(jar) {
      if (!jar) {
        console.log('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      jar = j;

      if (argv._.length < 3) {
        return Package.listBuilds(appId, jar);
      }

      return { data: [ { id: argv._[2] } ] };
    })
    .then(function(body) {
      return Package.getBuild(appId, jar, body.data[0].id, { fields: ['output'] });
    })
    .then(function(body) {
      var table = new Table(),
          build = body.data;

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

      console.log('');
      console.log(table.toString());
      console.log('');

      if (build.output) {
        console.log('output'.yellow + ':');
        console.log('');
        console.log(build.output);
        console.log('');
      }

    })
    .catch(function(ex) {
      Utils.fail(ex, 'package');
    });

}

function packageDownload(ionic, argv, dir, project, appId) {

  var jar,
      bar,
      downloadDirectory;

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
        console.log('No previous login existed. Attempting to log in now.');
        return LoginTask.login(argv);
      }
      return jar;
    })
    .then(function(j) {
      jar = j;

      if (argv._.length < 3) {
        return Package.listBuilds(appId, jar);
      }

      return { data: [ { id: argv._[2] } ] };
    })
    .then(function(body) {
      return Package.downloadBuild(appId, jar, body.data[0].id, downloadDirectory);
    })
    .then(function(filename) {
      if (typeof bar !== 'undefined') {
        bar.tick(bar.total);
      }

      console.log('Wrote:', filename);
      console.success('Done!'.green);
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
      Utils.fail(ex);
    });

}

exports.IonicTask = IonicTask;
