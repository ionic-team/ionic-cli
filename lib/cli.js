var Cli = {};
var IonicAppLib = require('ionic-app-lib');
var IonicStats = require('./utils/stats');
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
var appLibUtils = IonicAppLib.utils;
var Logging = IonicAppLib.logging;
var log = Logging.logger;
var Q = require('q');
var helpUtil = require('./utils/help');
var EOL = require('os').EOL;
var chalk = require('chalk');

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

  /*
  * Before taking any more steps, lets check their
  * environment and display any upgrade warnings
  */
  return Q.all([
    Cli.doRuntimeCheck(),
    Cli.checkLatestVersion()
  ]).then(function() {
    Cli.runr(processArgv);
  }).catch(function(ex) {
    return appLibUtils.fail(ex);
  });
};
Cli.runr = function runr(processArgv) {
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

    process.on('exit', function() {
      Cli.printVersionWarning(settings.version, Cli.npmVersion);
    });

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

    var taskName = argv._[0];
    var task = Cli.getTaskSettingsByName(taskName);
    log.debug('Task:', task);

    // If no task is found then just provide the list of tasks available
    if (!task) {
      taskList = Cli.getAllTaskSettings();
      return Q.fcall(helpUtil.printTaskListShortUsage, taskList, taskName, Cli.VERSION);
    }

    var booleanOptions = Cli.getListOfBooleanOptions(task.options);

    // Gather stats on the current command execution
    IonicStats.t();

    // Remove all possible task boolean options from the args
    argv = optimist(rawCliArguments)
      .boolean(booleanOptions)
      .argv;

    // No need to do project specific actions, cd to root, etc.
    if (!task.isProjectTask) {
      return Q.fcall(task.run.bind(task), Cli, argv, rawCliArguments);
    }

    var root = appLibUtils.cdIonicRoot();
    var project = IonicProject.load(root);
    argv.v2 = project && project.get('v2');

    // For v1 projects ignore as this could have been skipped for faster start
    // and gulp hooks aren't required
    // For v2, print a warning as this is most likely not what they want
    if (!fs.existsSync('node_modules')) {
      if (argv.v2) {
        log.warn(chalk.yellow('WARN: No node_modules directory found, do you need to run npm install?'));
      }
      log.debug('node_modules directory not found, not running gulp hooks');

      return Q.fcall(task.run.bind(task), Cli, argv, rawCliArguments);
    }

    // Check if there are npm scripts in the package.json
    var npmScripts = Cli.loadNpmScripts();

    try {
      var gulpLoaded = Cli.loadGulpfile();
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        log.info('Uh oh! Looks like you\'re missing a module in your gulpfile:');
        log.error(e.message);
        log.info('\nDo you need to run `npm install`?\n');
        process.exit(1);
      }
      log.error(chalk.red('\nThere is an error in your gulpfile: '));
      log.error(e.stack + '\n');
      process.exit(1);
    }

    log.debug('\nNpm scripts:', npmScripts);
    log.debug('Gulpfile found:', gulpLoaded, '\n');

    if (npmScripts && (npmScripts.hasOwnProperty(taskName + ':before') || npmScripts.hasOwnProperty(taskName + ':after'))) {
      return Cli.runWithNpmScripts(argv, task, rawCliArguments);
    } else if (gulpLoaded) {
      return Cli.runWithGulp(argv, task, rawCliArguments);
    }

    if (!gulpLoaded) {

      // warn if no build file and it's a command that requires a build step
      // but still run the command with no hooks
      if (Cli.isBuildCommand(taskName) && argv.v2 && !npmScripts) {
        log.warn('WARN: No build file found!');
        log.warn('If your app requires a build step, you may want to ensure it runs before ' + taskName + '.\n');
      }
      if (!npmScripts) {
        log.debug('No gulpfile found, not running gulp hooks');
      }
    }

    return Q.fcall(task.run.bind(task), Cli, argv, rawCliArguments);

  } catch (ex) {
    return appLibUtils.fail(ex);
  }
};

Cli.runWithGulp = function runWithGulp(argv, taskInstance, rawCliArguments) {
  var cmdName = argv._[0];
  var beforeHook = cmdName + ':before';
  var afterHook = cmdName + ':after';

  try {
    var gulp = require(path.resolve(process.cwd() + '/node_modules/gulp'));
  } catch (e) {

    // Empty gulpfile (or one that doesn't require gulp?), and no gulp
    log.error(chalk.red('\nGulpfile detected, but gulp is not installed'));
    log.error(chalk.red('Do you need to run `npm install`?\n'));
    return process.exit(1);
  }

  // setup gulp logging
  Cli.logEvents(gulp, [beforeHook, afterHook]);

  // if there is no before hook there's no need to run gulp
  var beforeHookPromise = Q(true);
  if (gulp.tasks[beforeHook]) {
    log.info('\nRunning \'' + beforeHook + '\' gulp task before ' + cmdName);
    beforeHookPromise = Cli.runGulpHook(gulp, beforeHook);

  } else if (Cli.isBuildCommand(cmdName) && argv.v2) {
    log.warn(chalk.yellow('WARN: No \'' + beforeHook + '\' gulp task found!'));
    log.warn(chalk.yellow('If your app requires a build step, you may want to ensure it runs before ' +
              cmdName + '.\n'));
  }

  // run beforeHook
  return beforeHookPromise

  // run cmd
    .then(function() {
      return Q.fcall(taskInstance.run.bind(taskInstance), Cli, argv, rawCliArguments);
    })

  // run afterHook
    .then(function() {
      if (gulp.tasks[afterHook]) {
        log.info('\nRunning \'' + afterHook + '\' gulp task after ' + cmdName);

        return Cli.runGulpHook(gulp, afterHook);
      }
    });
};

Cli.runGulpHook = function runGulpHook(gulp, hookName) {

  // swallow errors because we already check to make sure the task exists
  // so not a missingTask error, and gulp already reports its own errors
  // which we set up with Cli.logEvents
  return Q.nfcall(gulp.start.bind(gulp), hookName)
    .catch(function() {});
};

Cli.loadGulpfile = function loadGulpfile() {

  // TODO add babel support?
  var names = ['gulpfile.js', 'Gulpfile.js'];
  for (var i = 0, ii = names.length; i < ii; i += 1) {
    try {
      require(path.resolve(process.cwd(), names[i]));
      log.verbose('Gulpfile found');
      return true;
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND' && e.message.indexOf(names[i]) !== -1) {

        // ignore missing gulpfile
        continue;
      }
      throw e;
    }
  }
  return false;
};

Cli.runWithNpmScripts = function runWithNpmScripts(argv, taskInstance, rawCliArguments) {
  var cmdName = argv._[0];
  var beforeHook = cmdName + ':before';
  var afterHook = cmdName + ':after';

  var packageFile = require(path.resolve(process.cwd() + '/package.json'));
  var scripts = packageFile.scripts;

  var beforeHookPromise = Q(true);
  if (scripts[beforeHook]) {
    log.info('\nRunning \'' + beforeHook + '\' npm script before ' + cmdName);
    beforeHookPromise = Cli.runNpmHook(scripts[beforeHook]);
  }

  // run beforeHook
  return beforeHookPromise

    // run cmd
    .then(function() {
      return Q.fcall(taskInstance.run.bind(taskInstance), Cli, argv, rawCliArguments);
    })

    // run afterHook
    .then(function() {
      if (scripts[afterHook]) {
        log.info('\nRunning \'' + afterHook + '\' npm script before ' + cmdName);
        return Cli.runNpmHook(scripts[afterHook]);
      }
    });
};

Cli.runNpmHook = function runNpmHook(hook) {
  var cmd = 'npm';
  var args = ['run', hook];
  var command = cmd + ' ' + args;

  // Force colors for all spawned child processes
  process.env['FORCE_COLOR'] = true;

  var q = Q.defer();
  var crossSpawn = require('cross-spawn');

  var spawned = crossSpawn.spawn('npm', args, { stdio: ['pipe', 'pipe', process.stderr] });
  spawned.on('error', function(err) {
    log.error('Unable to run spawn command ' + err);
  });
  spawned.stdout.pipe(process.stdout);
  spawned.stdout.on('data', function(data) {
    var dataLines = data.toString().split(EOL);
    for (var i = 0; i < dataLines.length; i += 1) {
      if (dataLines[i].length) {
        if (dataLines[i].indexOf('watch ready') > -1) {
          return q.resolve();
        }
      }
    }
  });
  spawned.on('exit', function(code) {
    log.debug('Spawn command', command, 'completed');
    if (code !== 0) {
      return q.reject('There was an error with the spawned command: ' + command);
    }
    return q.resolve();
  });

  // If this process ends ensure that we killed the spawned child
  process.on('exit', function() {
    spawned.kill();
  });

  return q.promise;
};

Cli.loadNpmScripts = function loadNpmScripts() {
  var fileName = 'package.json';

  try {
    var packageFile = require(path.resolve(process.cwd(), fileName));
    log.verbose('Package.json found scripts:', packageFile.scripts);
    return packageFile.scripts;
  } catch (e) {
    throw e;
  }
};

Cli.logEvents = function logEvents(gulpInst, finalTaskNames) {
  var prettyTime = require('pretty-hrtime');
  var gutil = require('gulp-util');

  gulpInst.on('task_start', function(e) {

    // TODO: batch these
    // so when 5 tasks start at once it only logs one time with all 5
    gutil.log('Starting', '\'' + chalk.cyan(e.task) + '\'...');
  });

  gulpInst.on('task_stop', function(e) {
    var time = prettyTime(e.hrDuration);
    gutil.log(
      'Finished', '\'' + chalk.cyan(e.task) + '\'',
      'after', chalk.magenta(time)
    );
    if (finalTaskNames.indexOf(e.task) > -1) {
      log.info();
    }
  });

  gulpInst.on('task_err', function(e) {
    var msg = Cli.formatGulpError(e);
    var time = prettyTime(e.hrDuration);
    gutil.log(
      '\'' + chalk.cyan(e.task) + '\'',
      chalk.red('errored after'),
      chalk.magenta(time)
    );
    gutil.log(msg);
  });
};

// Format orchestrator errors
Cli.formatGulpError = function formatGulpError(e) {
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
};

Cli.isBuildCommand = function isBuildCommand(cmdName) {
  return /serve|build|run|emulate|upload/.test(cmdName);
};

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


Cli.printVersionWarning = function printVersionWarning(version, npmVersion) {
  if (version.indexOf('beta') > -1 || version.indexOf('alpha') > -1) {
    return;
  }

  if (npmVersion && npmVersion !== version.trim()) {
    log.warn(chalk.red('\n------------------------------------\n'));
    log.warn(chalk.yellow.bold('Ionic CLI is out of date:\n'));
    log.warn(chalk.yellow(' * Locally installed version: ' + version + '\n'));
    log.warn(chalk.yellow(' * Latest version: ' + npmVersion + '\n'));
    log.warn(chalk.yellow(' * https://github.com/driftyco/ionic-cli/blob/master/CHANGELOG.md\n'));
    log.warn(chalk.yellow(' * Run ') + chalk.bold('npm install -g ionic') + chalk.yellow(' to update\n'));
    log.warn(chalk.red('------------------------------------\n\n'));
  }
};

Cli.checkLatestVersion = function checkLatestVersion(settingsVersion) {
  var resultsDeferred = Q.defer();

  try {
    if (settingsVersion.indexOf('beta') > -1 || settingsVersion.indexOf('alpha') > -1) {

      // don't bother checking if its a beta
      resultsDeferred.resolve();
      return;
    }

    var versionCheck = IonicConfig.get('versionCheck');
    if (versionCheck && ((versionCheck + 86400000) > Date.now())) {

      // we've recently checked for the latest version, so don't bother again
      resultsDeferred.resolve();
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
      resultsDeferred.resolve();
    });
  } catch (e) {
    resultsDeferred.resolve();
  }

  return resultsDeferred.promise;
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

        log.info('+---------------------------------------------------------+\n');

        var monthMessage = ['+ Extra! Extra! Ionic Updates for ',
          monthNames[d.getMonth()],
          ' ',
          d.getFullYear(),
          '\n+\n'].join('');
        log.info(monthMessage);

        for (var i = 0, j = messagesJson.list.length; i < j; i += 1) {
          var entry = messagesJson.list[i];
          var entryMessage = ['+ ', entry.name, '\n', '+ ', chalk.blue.bold(entry.action), '\n+\n'].join('');
          log.info(entryMessage);
        }
        log.info(chalk.green('+---------------------------------------------------------+\n'));
      } catch (ex) {
        q.reject('Error occurred in downloading the CLI messages:', ex);
        appLibUtils.fail(ex);
      }
      q.resolve(messagesJson);
    } else {
      log.error('Unable to fetch', err, res.statusCode);
      q.reject(res);
    }
  });
  return q.promise;
};

Cli.handleUncaughtExceptions = function handleUncaughtExceptions(err) {
  log.error(chalk.red.bold('An uncaught exception occurred and has been reported to Ionic'));
  var errorMessage = typeof err === 'string' ? err : err.message;
  appLibUtils.errorHandler(errorMessage);
  process.exit(1);
};

Cli.attachErrorHandling = function attachErrorHandling() {
  appLibUtils.errorHandler = function errorHandler(msg) {
    log.debug('Cli.appLibUtils.errorHandler msg', msg, typeof msg);
    var stack = typeof msg == 'string' ? '' : msg.stack;
    var errorMessage = typeof msg == 'string' ? msg : msg.message;
    var promise = Q();
    if (msg) {
      promise = Info.gatherInfo().then(function(info) {
        var ionicCliVersion = info.ionic_cli;
        if (stack && stack.length > 0) {
          process.stderr.write('\n' + chalk.bold(stack) + '\n\n');
        }
        process.stderr.write('\n' + chalk.bold(errorMessage));
        process.stderr.write(chalk.bold(' (CLI v' + ionicCliVersion + ')') + '\n');

        Info.printInfo(info);
      });
    }
    promise.then(function() {
      process.stderr.write('\n');
      process.exit(1);
      return '';
    }).catch(function(ex) {
      console.log('errorHandler had an error', ex);
      console.log(ex.stack);
    });
  };

  // TODO Attach error reporter here
};

// Backwards compatability for those commands that havent been
// converted yet.
Cli.fail = function fail(err, taskHelp) {
  appLibUtils.fail(err, taskHelp);
};

Cli.getContentSrc = function getContentSrc() {
  return appLibUtils.getContentSrc(process.cwd());
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
    return Info.gatherInfo().then(function(info) {
      Info.checkRuntime(info);
      IonicConfig.set('lastVersionChecked', version);
      IonicConfig.save();
    });
  }

  return Q();
};

module.exports = Cli;
