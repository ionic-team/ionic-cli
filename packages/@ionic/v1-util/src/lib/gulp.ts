import * as path from 'path';

import chalk from 'chalk';
import * as gulpType from 'gulp';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { promisify } from '@ionic/cli-framework/utils/promise';

import { timestamp } from './log';

let _gulpInst: typeof gulpType;

export async function loadGulp(): Promise<typeof gulpType> {
  const gulpFilePath = path.resolve('gulpfile.js');

  try {
    _gulpInst = require('gulp');
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
    const gulpStart = promisify<void, string>(gulp.start.bind(gulp));

    process.stdout.write(`${timestamp()} Invoking ${chalk.cyan(name)} gulp task.\n`);
    await gulpStart(name);
  } catch (e) {
    process.stderr.write(`${timestamp()} Cannot run ${chalk.cyan(name)} task: ${String(e)}\n`);
  }
}
