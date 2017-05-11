import * as path from 'path';
import * as chalk from 'chalk';

export function checkEnvironment(projectDirectory: string): boolean {
  try {
    var gulpFileExists = doesGulpFileExist(projectDirectory);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw 'Uh oh! Looks like you\'re missing a module in your gulpfile:\n' +
      '\nDo you need to run `npm install`?\n';
    }
    throw `${chalk.red('\nThere is an error in your gulpfile: ')}\n` +
    `e.stack\n`;
  }

  return gulpFileExists;
}

export function setupGulpInstance(projectDirectory: string): any {
  try {
    var gulp = require(path.join(projectDirectory, 'node_modules', 'gulp'));
  } catch (e) {

    // Empty gulpfile (or one that doesn't require gulp?), and no gulp
    throw `Gulpfile detected, but gulp is not installed.\nDo you need to run npm install`;
  }

  // setup gulp logging
  return patchGulpEventLogging(gulp);
}

export function runGulpHook(gulp: any, hookName: string): Promise<any> {

  // swallow errors because we already check to make sure the task exists
  // so not a missingTask error, and gulp already reports its own errors
  // which we set up with Cli.logEvents
  return new Promise((resolve, reject) => {
    gulp.start.bind(gulp, hookName, (err: any, results: any) => {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
}

function doesGulpFileExist(projectDirectory: string): boolean {
  var names = ['gulpfile.js', 'Gulpfile.js'];
  for (var i = 0, ii = names.length; i < ii; i += 1) {
    try {
      require(path.join(projectDirectory, names[i]));
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
}

function patchGulpEventLogging(gulpInst: any): any {

  gulpInst.on('task_start', function(e: any) {

    // TODO: batch these
    // so when 5 tasks start at once it only logs one time with all 5
    console.log('Starting', '\'' + chalk.cyan(e.task) + '\'...');
  });

  gulpInst.on('task_stop', function(e: any) {
    console.log(
      'Finished'
    );
  });

  gulpInst.on('task_err', function(e: any) {
    var msg = formatGulpError(e);
    console.log(
      '\'' + chalk.cyan(e.task) + '\'',
      chalk.red('errored after'),
    );
    console.log(msg);
  });

  return gulpInst;
}

// Format orchestrator errors
function formatGulpError(e: any) {
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
