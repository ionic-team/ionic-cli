var Cli = {};
var optimist = require('optimist');
var path = require('path');
var fs = require('fs');
var settings = require('../package.json');
var Tasks = require('./config/commands').allCommands;
var Q = require('q');
var EOL = require('os').EOL;
var chalk = require('chalk');


  try {
    var gulpLoaded = Cli.loadGulpfile();
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      log.info('Uh oh! Looks like you\'re missing a module in your gulpfile:');
      log.error(e.message);
      log.info('\nDo you need to run `npm install`?\n');
      throw e;
    }
    log.error(chalk.red('\nThere is an error in your gulpfile: '));
    log.error(e.stack + '\n');
    throw e;
  }

  log.debug('Gulpfile found:', gulpLoaded, '\n');

  if (gulpLoaded) {
    return Cli.runWithGulp(argv, task, rawCliArguments, log);
  }

  if (!gulpLoaded) {
    log.debug('No gulpfile found, not running gulp hooks');
  }

Cli.runWithGulp = function runWithGulp(argv, taskInstance, rawCliArguments, log) {
  var cmdName = argv._[0];
  var beforeHook = cmdName + ':before';
  var afterHook = cmdName + ':after';

  try {
    var gulp = require(path.resolve(process.cwd() + '/node_modules/gulp'));
  } catch (e) {

    // Empty gulpfile (or one that doesn't require gulp?), and no gulp
    log.error(chalk.red('\nGulpfile detected, but gulp is not installed'));
    log.error(chalk.red('Do you need to run `npm install`?\n'));
    throw e;
  }

  // setup gulp logging
  Cli.logEvents(gulp, [beforeHook, afterHook], log);

  // if there is no before hook there's no need to run gulp
  var beforeHookPromise = Q(true);
  if (gulp.tasks[beforeHook]) {
    log.info('\nRunning \'' + beforeHook + '\' gulp task before ' + cmdName);
    beforeHookPromise = Cli.runGulpHook(gulp, beforeHook);

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

Cli.logEvents = function logEvents(gulpInst, finalTaskNames, log) {
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

module.exports = Cli;
