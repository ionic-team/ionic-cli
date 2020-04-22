import { prettyPath } from '@ionic/cli-framework/utils/format';
import { promisify } from '@ionic/cli-framework/utils/promise';
import * as chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';

import { timestamp } from './log';

const debug = Debug('ionic:v1-toolkit:lib:gulp');

let _gulpInst: typeof import('gulp');

export async function loadGulp(): Promise<typeof import('gulp')> {
  if (!_gulpInst) {
    const gulpFilePath = path.resolve('gulpfile.js');
    debug(`Using gulpfile: ${gulpFilePath}`);

    try {
      const gulpPath = require.resolve('gulp');
      debug(`Using gulp: ${gulpPath}`);
      _gulpInst = require(gulpPath);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }

      throw new Error(chalk.red(`Cannot find module 'gulp'`));
    }

    let gulpFile: any;
    try {
      gulpFile = require(gulpFilePath); // requiring the gulp file sets up the gulp instance with local gulp task definitions

    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }

      throw new Error(
        `Error in module: ${chalk.bold(prettyPath(gulpFilePath))}:\n` +
        chalk.red(e.stack ? e.stack : e)
      );
    }

    // Add gulp file v4 compatibility - fix #4114
    const isGulpV4File = gulpFile && Object.keys(gulpFile)
      .findIndex(key => typeof gulpFile[key] === 'function') !== -1;
    if (isGulpV4File) {
      try {
        debug(`Declaring gulp v4 tasks...`);
        Object.keys(gulpFile)
          .forEach(key => {
            const task = gulpFile[key];

            // Keep functions only
            if (typeof task === 'function') {
              debug(` - task ${key}`);

              // Declare using gulp.task()
              _gulpInst.task(key, [] /*no dependencies*/, done => {
                return new Promise(resolve => {
                  // Execute the task.
                  // Do NOT pass done function to the task, because 'watch' can never finished
                  task.call(gulpFile);

                  // Finish, to let ionic-cli start to serve
                  done();
                });
              });
            }
          });
      } catch (e) {
        throw new Error(`Cannot declare gulp v4 task: ${chalk.bold(prettyPath(gulpFilePath))}:\n` +
          chalk.red(e.stack ? e.stack : e));
      }
    }

    debug('Loaded gulp tasks: %o', _gulpInst.tasks);
  }

  return _gulpInst;
}

export async function hasTask(name: string): Promise<boolean> {
  try {
    const gulp = await loadGulp();
    return gulp.hasTask(name);
  } catch (e) {
    process.stderr.write(`${timestamp()} Cannot load gulp: ${String(e)}\n`);
  }

  return false;
}

export async function runTask(name: string): Promise<void> {
  if (!(await hasTask(name))) {
    process.stderr.write(`${timestamp()} Cannot run ${chalk.cyan(name)} task: missing in ${chalk.bold('gulpfile.js')}\n`);
    return;
  }

  try {
    const gulp = await loadGulp();
    const boundStart = gulp.start.bind(gulp);
    const gulpStart = promisify<void, string>(boundStart as any);

    process.stdout.write(`${timestamp()} Invoking ${chalk.cyan(name)} gulp task.\n`);
    await gulpStart(name);
  } catch (e) {
    process.stderr.write(`${timestamp()} Cannot run ${chalk.cyan(name)} task: ${String(e)}\n`);
  }
}
