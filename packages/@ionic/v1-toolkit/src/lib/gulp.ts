import { prettyPath } from '@ionic/cli-framework/utils/format';
import { promisify } from '@ionic/cli-framework/utils/promise';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as ζgulp from 'gulp';
import * as path from 'path';

import { timestamp } from './log';

const debug = Debug('ionic:v1-toolkit:lib:gulp');

let _gulpInst: typeof ζgulp;

export async function loadGulp(): Promise<typeof ζgulp> {
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

    try {
      require(gulpFilePath); // requiring the gulp file sets up the gulp instance with local gulp task definitions
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }

      throw new Error(
        `Error in module: ${chalk.bold(prettyPath(gulpFilePath))}:\n` +
        chalk.red(e.stack ? e.stack : e)
      );
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
