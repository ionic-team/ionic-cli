var Cli = {};
var IonicAppLib = require('ionic-app-lib');
var IonicStats = require('./utils/stats').IonicStats;
var IonicStore = require('./utils/store');
var IonicConfig = new IonicStore('ionic.config');
var Info = IonicAppLib.info;
var IonicProject = IonicAppLib.project;
var optimist = require('optimist');
var path = require('path');
var fs = require('fs');
var settings = require('../package.json');
var Tasks = require('./config/commands').allCommands;
var orderedListOfTasks = require('./config/commands').orderedListOfCommands;
var Utils = IonicAppLib.utils;
var Logging = IonicAppLib.logging;
var log = Logging.logger;
var Q = require('q');
var helpUtil = require('./utils/help');

Cli.ALL_TASKS = Tasks;
Cli.IONIC_DASH = 'https://apps.ionic.io';
Cli.IONIC_API = '/api/v1/';
Cli.PRIVATE_PATH = '.ionic';
Cli.VERSION = settings.version;

// This is where the logger for the app-lib can be configured (or replaced).
log.level = 'info';

/**
 * The main entry point for the CLI
 * This takes the process.argv array for arguments
 * The args passed should be unfiltered.
 * From here, we will filter the options/args out
 * using optimist. Each command is responsible for
 * parsing out the args/options in the way they need.
 * This way, we can still test with passing in arguments.
 *
 * @method run
 * @param {Array} processArgv a list of command line arguments including
 * @return {Promise}
 */
Cli.run = function run(processArgv) {
  try {

    /*
     * First we parse out the args to use them.
     * Later, we will fetch the command they are trying to
     * execute, grab those options, and reparse the arguments.
     */
    var rawCliArguments = processArgv.slice(2);
    var argv = optimist(rawCliArguments).argv;
    var taskList;

    Cli.attachErrorHandling();
    Cli.checkLatestVersion();

    process.on('exit', function() {
      Cli.printVersionWarning();
    });

    /*
     * Before taking any more steps, lets check their
     * environment and display any upgrade warnings
     */
    Cli.doRuntimeCheck(settings.version);

    /*
     * Print version if '--version' or '--v' is an option
     * TODO: version should probably also be a command
     *       and this should just map the option to a command
     */
    if ((argv.version || argv.v) && !argv._.length) {
      return Q.fcall(Cli.version);
    }

    /*
     * Print ionitron if '--ionitron' is an option
     * TODO: ionitron should probably also be a command
     *       and this should just map the option to a command
     */
    if (argv.ionitron) {
      var Ionitron = require('./utils/ionitron');
      var lang = argv.es ? 'es' : 'en';
      return Q.fcall(Ionitron.print, lang);
    }

    /*
     * Set log level to debug if '--verbose' is an option
     * TODO: This might be better to handle the verbose flag
     *       in each individual command
     */
    if (argv.verbose) {
      log.level = 'debug';
    }

    /*
     * Print help if '--help' or '-h' is an option
     * TODO: help should probably be a command and option on commands
     *       $ ionic help start (ALREADY WORKS)
     *       $ ionic start --help
     */
    if (argv.help || argv.h) {
      taskList = Cli.getAllTaskSettings();
      return Q.fcall(helpUtil.printTaskListUsage, taskList, Cli.VERSION);
    }

    /*
     * TODO: Change stats-opt-out to be a command that updates config rather
     * than an option that is passed.
     */
    if (argv['stats-opt-out']) {
      IonicConfig.set('statsOptOut', true);
      IonicConfig.save();
      log.info('Successful stats opt-out');
      return Q.fcall(function() {
        return 'saved';
      });
    }

    // Gather stats on the current command execution
    IonicStats.t();

    var taskName = argv._[0];
    var task = Cli.getTaskSettingsByName(taskName);

    // If no task is found then just provide the list of tasks available
    if (!task) {
      taskList = Cli.getAllTaskSettings();
      return Q.fcall(helpUtil.printTaskListShortUsage, taskList, taskName, Cli.VERSION);
    }

    log.debug('Task:', task);

    var booleanOptions = Cli.getListOfBooleanOptions(task.options);

    // Remove all possible task boolean options from the args
    argv = optimist(rawCliArguments)
      .boolean(booleanOptions)
      .argv;

    // this should be tracked by each task
    if (!task.disableChangePwd) {
      var root = Utils.cdIonicRoot();
      var project = IonicProject.load(root);
      argv.v2 = project && project.get('v2');
      argv.v2 && log.debug('Ionic 2 project.');

      if (fs.existsSync('node_modules')) {

        // run with gulp hooks
        return runWithGulp(argv, task);
      } else if (argv.v2) {
        log.warn('WARN: No node_modules directory found, do you need to run npm install?'.yellow);
      }
    }
    return Q.fcall(task.run, Cli, argv);

  } catch (ex) {
    return Utils.fail(ex);
  }
};

function runWithGulp(argv, taskInstance) {
  var cmdName = argv._[0];
  var beforeHook = cmdName + ':before';
  var afterHook = cmdName + ':after';

  if (loadGulpfile()) {
    log.verbose('Gulpfile found');

    try {
      var gulp = require(path.resolve(process.cwd() + '/node_modules/gulp'));
    } catch (e) {

      // Empty gulpfile (or one that doesn't require gulp?), and no gulp
      log.error('\nGulpfile detected, but gulp is not installed'.red);
      log.error('Do you need to run `npm install`?\n'.red);
      process.exit(1);
    }
    logEvents(gulp, [beforeHook, afterHook]);

    if (gulp.tasks[beforeHook]) {
      log.info('\nRunning \'' + beforeHook + '\' gulp task before ' + cmdName);
    }
    return Q.nfcall(gulp.start.bind(gulp), beforeHook).then(
      function() {

        // Only some commands return promises, so wrap it
        return Q.fcall(taskInstance.run, Cli, argv);
      },
      function(e) { // task error, let gulp handle it

        // if there is no hook task, but it's a v2 app and a command that usually needs a hook
        if (e.missingTask && /serve|build|run|emulate|upload/.test(cmdName) && argv.v2) {
          var taskName = (cmdName === 'serve') ? 'watch' : 'build';
          log.warn(('WARN: No \'' + beforeHook + '\' gulp task found!').yellow);

          // The task exists, but there are no hooks for it
          // They have the old config file, so we're safe to yell at them
          // With new config, may intentionally not have hooks if running their own build
          if (gulp.tasks[taskName] && fs.existsSync('ionic.config.js')) {
            log.info(('Your gulpfile contains a \'' + taskName + '\' task already! Add:\n').cyan);
            log.info(('    gulp.task(\'' + cmdName + ':before\', [\'' + taskName + '\']);\n').cyan);
            log.info(('to your gulpfile to have Ionic CLI run \'' + taskName + '\' before ' + cmdName + '.\n').cyan);
          } else {
            log.warn(('If your app requires a build step, you may want to ensure it runs before ' +
                      cmdName + '.\n').yellow);
          }
        }

        // Only some commands return promises, so wrap it
        return Q.fcall(taskInstance.run, Cli, argv);
      }
    ).then(function() {
      if (gulp.tasks[afterHook]) {
        log.info('\nRunning \'' + afterHook + '\' gulp task after ' + cmdName);
      }
      return Q.nfcall(gulp.start.bind(gulp), afterHook);
    });
  }

  // No gulpfile
  if (/serve|build|run|emulate|upload/.test(cmdName) && argv.v2) {
    log.warn('WARN: No gulpfile found!');
    log.warn('If your app requires a build step, you may want to ensure it runs before ' + cmdName + '.\n');

    if (fs.existsSync('ionic.config.js')) {
      var inquirer = require('inquirer');
      var deferred = Q.defer();

      log.info('Looks like you are using the deprecated ionic.config.js and have no gulpfile!');
      log.info('As of beta.21 the Ionic CLI relies on gulp hooks to build your web assets\n');
      inquirer.prompt([{
        type: 'confirm',
        name: 'downloadGulp',
        message: 'Would you like to download the default gulpfile?'.cyan
      }],
      function(answers) {
        answers.downloadGulp ? deferred.resolve() : deferred.reject();
      });
      return deferred.promise.then(
        function() {
          return downloadDefaultGulpfile(cmdName).then(
            installGulpfilePackages,
            function(err) {
              log.error('There was an error downloading the default gulpfile: ' + err);
              process.exit(1);
            }
          ).then(
            function() {
              log.info('Npm packages installed successfully. Try running \'' + cmdName + '\' again.');
            },
            function() {
              log.warn('There was an error installing the packages required by the gulpfile.');
              log.warn('You\'ll need to install the following packages manually: ');
            }
          );
        },
        function() {
          return Q.fcall(taskInstance.run, Cli, argv);
        }
      );
    }
  }

  return Q.fcall(taskInstance.run, Cli, argv);
}

function loadGulpfile() {

  // TODO add babel support?
  var names = ['gulpfile.js', 'Gulpfile.js'];
  for (var i = 0, ii = names.length; i < ii; i += 1) {
    try {
      require(path.resolve(process.cwd() + '/' + names[i]));
      return true;
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        if (e.message.indexOf(names[i]) === -1) {
          log.info('Uh oh! Looks like you\'re missing a module in your gulpfile:');
          log.error(e.message);
          log.info('\nDo you need to run `npm install`?\n');
          process.exit(1);
        } else {

          // ignore missing gulpfile
          continue;
        }
      }
      log.error('There is an error in your gulpfile: ');
      log.error(e.stack);
      process.exit(1);
    }
  }
  return false;
}

function downloadDefaultGulpfile() {
  var https = require('https');
  var fileStream = fs.createWriteStream('gulpfile.js');
  var deferred = Q.defer();
  var project = IonicProject.load();
  var branch = project.get('typescript') ? 'typescript' : 'master';
  var url = 'https://raw.githubusercontent.com/driftyco/ionic2-app-base/' + branch + '/gulpfile.js';

  log.info('\nDownloading default gulpfile from: ' + url);

  fileStream.on('open', function() {
    https.get(url, function(res) {
      res.on('error', function(err) {
        deferred.reject(err);
      });

      res.pipe(fileStream);
    });
  }).on('error', function(err) {
    deferred.reject(err);
  }).on('finish', function() {
    deferred.resolve();
  });

  return deferred.promise;
}

function installGulpfilePackages() {
  var detective = require('detective');
  var requires = detective(fs.readFileSync('gulpfile.js'));
  var deferred = Q.defer();

  log.info('Successfully downloaded gulpfile.\n'.green);
  log.info('Now installing npm packages used by the gulpfile: ');
  log.info('    ' + requires.join(' ') + '\n');

  var npmInstall = require('child_process').spawn('npm', ['install', '--save-dev'].concat(requires));
  npmInstall.stdout.on('data', function(data) { log.debug(data); });
  npmInstall.stderr.on('data', function(data) { log.debug(data); });
  npmInstall.on('error', function(err) {
    log.error('Error in gulp npm install: ' + err.stack);
  });
  npmInstall.on('exit', function(code) {
    code !== 0 ? deferred.reject() : deferred.resolve();
  });

  return deferred.promise;
}


function logEvents(gulpInst, finalTaskNames) {
  var prettyTime = require('pretty-hrtime');
  var gutil = require('gulp-util');

  gulpInst.on('task_start', function(e) {

    // TODO: batch these
    // so when 5 tasks start at once it only logs one time with all 5
    gutil.log('Starting', '\'' + e.task.cyan + '\'...');
  });

  gulpInst.on('task_stop', function(e) {
    var time = prettyTime(e.hrDuration);
    gutil.log(
      'Finished', '\'' + e.task.cyan + '\'',
      'after', time.magenta
    );
    if (finalTaskNames.indexOf(e.task) > -1) {
      log.info();
    }
  });

  gulpInst.on('task_err', function(e) {
    var msg = formatGulpError(e);
    var time = prettyTime(e.hrDuration);
    gutil.log(
      '\'' + e.task.cyan + '\'',
      'errored after'.red,
      time.magenta
    );
    gutil.log(msg);
  });

  // gulpInst.on('task_not_found', function(err) {
  //   gutil.log(
  //     ('Task \'' + err.task + '\' is not in your gulpfile').red
  //   );
  //   gutil.log('Please check the documentation for proper gulpfile formatting');
  //   process.exit(1);
  // });
}

// Format orchestrator errors
function formatGulpError(e) {
  if (!e.err) {
    return e.message;
  }

  // PluginError
  if (typeof e.err.showStack === 'boolean') {
    return e.err.toString();
  }

  // Normal error
  if (e.err.stack) {
    return e.err.stack;
  }

  // Unknown (string, number, etc.)
  return new Error(String(e.err)).stack;
}


/**
 * Method accepts an object of 'task options' and returns all
 * boolean options that are available
 *
 * @method getListOfBooleanOptions
 * @param {Object} taskOptionsObj
 * @return {Array} Returns array of all available boolean options
 */
Cli.getListOfBooleanOptions = function getListOfBooleanOptions(taskOptionsObj) {

  if (typeof taskOptionsObj !== 'object' || Object.keys(taskOptionsObj) === 0) {
    return [];
  }

  return Object.keys(taskOptionsObj)
    .filter(function(key) {
      return typeof taskOptionsObj[key] !== 'string';
    })
    .reduce(function(list, key) {
      var keyItems = key
        .split('|')
        .map(function(item) {
          return item.replace(/^-{1,2}/, '');
        });
      return list.concat(keyItems);
    }, []);
};


/**
 * @method lookupTask
 * @param {String} modulePath the path to the module to require.
 * @return {Object} Returns the module that the path specifies
 */
Cli.lookupTask = function lookupTask(modulePath) {
  return require(modulePath);
};


Cli.printVersionWarning = function printVersionWarning() {
  if (settings.version.indexOf('beta') > -1 || settings.version.indexOf('alpha') > -1) {
    return;
  }

  if (Cli.npmVersion && Cli.npmVersion !== settings.version.trim()) {
    process.stdout.write('\n------------------------------------\n'.red);
    process.stdout.write('Ionic CLI is out of date:\n'.bold.yellow);
    process.stdout.write((' * Locally installed version: ' + settings.version + '\n').yellow);
    process.stdout.write((' * Latest version: ' + Cli.npmVersion + '\n').yellow);
    process.stdout.write((' * https://github.com/driftyco/ionic-cli/blob/master/CHANGELOG.md\n').yellow);
    process.stdout.write(' * Run '.yellow + 'npm install -g ionic'.bold + ' to update\n'.yellow);
    process.stdout.write('------------------------------------\n\n'.red);
    Cli.npmVersion = null;
  }
};

Cli.checkLatestVersion = function checkLatestVersion() {
  Cli.latestVersion = Q.defer();

  try {
    if (settings.version.indexOf('beta') > -1 || settings.version.indexOf('alpha') > -1) {

      // don't bother checking if its a beta
      Cli.latestVersion.resolve();
      return;
    }

    var versionCheck = IonicConfig.get('versionCheck');
    if (versionCheck && ((versionCheck + 86400000) > Date.now())) {

      // we've recently checked for the latest version, so don't bother again
      Cli.latestVersion.resolve();
      return;
    }

    var proxy = process.env.PROXY || process.env.http_proxy || null;
    var request = require('request');
    request({ url: 'http://registry.npmjs.org/ionic/latest', proxy: proxy }, function(err, res, body) {
      if (err) {
        return console.log(err);
      }
      try {
        Cli.npmVersion = JSON.parse(body).version;
        IonicConfig.set('versionCheck', Date.now());
        IonicConfig.save();
      } catch (e) {
        console.log(e);
      }
      Cli.latestVersion.resolve();
    });
  } catch (e) {
    Cli.latestVersion.resolve();
  }

  return Cli.latestVersion.promise;
};


/**
 * @method getTaskSettingsByName
 * @param {String} taskName task name to look for
 * @return {Object} Returns the task settings object that matches
 */
Cli.getTaskSettingsByName = function getTaskSettingsByName(taskName) {
  var task;

  Object.keys(Cli.ALL_TASKS).every(function(listName) {
    if (listName === taskName) {
      task = require(Cli.ALL_TASKS[listName]);
      return false;
    }
    return true;
  });

  return task;
};


/**
 * @method getAllTaskSettings
 * @return {Array} Returns an array of task settings objects
 */
Cli.getAllTaskSettings = function getAllTaskSettings() {
  return orderedListOfTasks.map(function(listName) {
    return require(Cli.ALL_TASKS[listName]);
  });
};


Cli.processExit = function processExit(code) {
  if (Cli.cliNews && Cli.cliNews.promise) {
    Q.all([Cli.latestVersion.promise, Cli.cliNews.promise])
    .then(function() {
      process.exit(code);
    });
  } else {
    Cli.latestVersion.promise.then(function() {
      process.exit(code);
    });
  }
};


Cli.version = function version() {
  log.info(settings.version + '\n');
};


Cli.printNewsUpdates = function printNewsUpdates(skipNewsCheck) {
  if (typeof skipNewsCheck == 'undefined') {
    skipNewsCheck = true;
  }

  var q = Cli.cliNews = Q.defer();
  var proxy = process.env.PROXY || null;

  var request = require('request');
  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
  var d = new Date();

  var downloadUrl = 'http://code.ionicframework.com/content/cli-message.json';
  request({ url: downloadUrl, proxy: proxy }, function(err, res, html) {
    if (!err && res && parseInt(res.statusCode, 10) === 200) {
      try {
        var newsId = IonicConfig.get('newsId');
        var messagesJson = JSON.parse(html);
        if (skipNewsCheck || typeof newsId == 'undefined' || newsId !== messagesJson.id) {
          IonicConfig.set('newsId', messagesJson.id);
          IonicConfig.save();
        } else {
          q.resolve();
          return q.promise;
        }

        process.stdout.write('+---------------------------------------------------------+\n');

        var monthMessage = ['+ Extra! Extra! Ionic Updates for ',
          monthNames[d.getMonth()],
          ' ',
          d.getFullYear(),
          '\n+\n'].join('');
        process.stdout.write(monthMessage);

        for (var i = 0, j = messagesJson.list.length; i < j; i += 1) {
          var entry = messagesJson.list[i];
          var entryMessage = ['+ ', entry.name, '\n', '+ ', entry.action.blue.bold, '\n+\n'].join('');
          process.stdout.write(entryMessage);
        }
        process.stdout.write('+---------------------------------------------------------+\n'.green);
      } catch (ex) {
        q.reject('Error occurred in downloading the CLI messages:', ex);
        Utils.fail(ex);
      }
      q.resolve(messagesJson);
    } else {
      process.stdout.write('Unable to fetch', err, res.statusCode);
      q.reject(res);
    }
  });
  return q.promise;
};

Cli.gatherInfo = function gatherInfo() {
  var info = Info.gatherInfo();
  Info.getIonicVersion(info, process.cwd());
  Info.getIonicCliVersion(info, path.join(__dirname, '../'));
  return info;
};

Cli.handleUncaughtExceptions = function handleUncaughtExceptions(err) {
  console.log('An uncaught exception occurred and has been reported to Ionic'.error.bold);
  var errorMessage = typeof err === 'string' ? err : err.message;
  Utils.errorHandler(errorMessage);
  process.exit(1);
};

Cli.attachErrorHandling = function attachErrorHandling() {
  Utils.errorHandler = function errorHandler(msg) {
    try {
      log.debug('Cli.Utils.errorHandler msg', msg, typeof msg);
      var stack = typeof msg == 'string' ? '' : msg.stack;
      var errorMessage = typeof msg == 'string' ? msg : msg.message;
      if (msg) {
        var info = Cli.gatherInfo();
        var ionicCliVersion = info.ionic_cli;
        if (stack && stack.length > 0) {
          process.stderr.write('\n' + stack.bold + '\n\n');
        }
        process.stderr.write('\n' + errorMessage.bold);
        process.stderr.write((' (CLI v' + ionicCliVersion + ')').bold + '\n');

        Info.printInfo(info);
      }
      process.stderr.write('\n');
      process.exit(1);
      return '';
    } catch (ex) {
      console.log('errorHandler had an error', ex);
      console.log(ex.stack);
    }
  };

  // TODO Attach error reporter here
};

// Backwards compatability for those commands that havent been
// converted yet.
Cli.fail = function fail(err, taskHelp) {
  Utils.fail(err, taskHelp);
};

Cli.getContentSrc = function getContentSrc() {
  return Utils.getContentSrc(process.cwd());
};

Cli.doRuntimeCheck = function doRuntimeCheck(version) {
  var semver = require('semver');
  var lastVersionChecked = IonicConfig.get('lastVersionChecked');
  var versionHasBeenChecked;

  try {
    versionHasBeenChecked = semver.satisfies(version, lastVersionChecked);
  } catch (ex) {
    log.info(ex);
  }

  if (!lastVersionChecked || !versionHasBeenChecked) {
    Info.checkRuntime();
    IonicConfig.set('lastVersionChecked', version);
    IonicConfig.save();
  }
};

module.exports = Cli;
