import {prettyPath} from '@ionic/cli-framework/utils/format';
import * as chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';

import {timestamp} from './log';

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
              _gulpInst.task(key, task);
            }
          });
      } catch (e) {
        throw new Error(`Cannot declare gulp v4 task: ${chalk.bold(prettyPath(gulpFilePath))}:\n` +
          chalk.red(e.stack ? e.stack : e));
      }
      debug('Loaded gulp tasks: %o', _gulpInst.tree().nodes);
    }

    // V3 gulp file: failed
    else {
      throw new Error(`Your gulpfile.js is not compatible with Gulp v4:\n- Upgrade to gulp v4 (see https://zzz.buzz/2016/11/19/gulp-4-0-upgrade-guide/)\n- Or downgrade @ionic/v1-toolkit to <= 3.2.0.`);
    }
  }

  return _gulpInst;
}

export async function hasTask(name: string): Promise<boolean> {
  try {
    const gulp = await loadGulp();
    return (gulp.tree().nodes).includes(name);
  } catch (e) {
    process.stderr.write(`${timestamp()} Cannot load gulp: ${chalk.bold(String(e))}\n`+
      chalk.red(e.stack ? e.stack : e));
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
    // Load the task (gulp v4 return an executable wrapper)
    const taskWrapper = gulp.task(name) as any;
    process.stdout.write(`${timestamp()} Invoking ${chalk.cyan(name)} gulp task.\n`);
    // Execute as promise
    await new Promise(done => taskWrapper(done));
  } catch (e) {
    process.stderr.write(`${timestamp()} Cannot run ${chalk.cyan(name)} task: ${String(e)}\n` +
      chalk.red(e.stack ? e.stack : e));
  }
}
