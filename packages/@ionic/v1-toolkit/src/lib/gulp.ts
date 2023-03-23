import { prettyPath } from '@ionic/utils-terminal';
import * as chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';
import * as gulp from 'gulp';
import * as undertaker from 'undertaker';
import * as vm from "vm";

import { timestamp } from './log';
import {Context} from "vm";

type GulpInst = typeof gulp & typeof undertaker;

const debug = Debug('ionic:v1-toolkit:lib:gulp');

let _gulpInst: GulpInst;

/**
 * Include a script, resolving dependencies from the file directory.
 *
 * @param scriptFile
 */
function include(scriptFile: string) {
  debug(`Reading file ${scriptFile}...`);

  // Override the default require() function, to use script directory as base path for resolution
  const scriptDir = path.parse(scriptFile).dir;
  const context: Context = {
    require: (module: string) => {
      // If gulp, use our instance.
      // This is required to be sure gulp.task() will be register on the right instance
      if (module === 'gulp' && _gulpInst) return _gulpInst;

      const absolutePath = require.resolve(module, {paths: [scriptDir]});
      debug(` - resolved module '${module}' => '${absolutePath}'`);
      return require(absolutePath);
    }
  }
  const script = fs.readFileSync(scriptFile, 'utf-8');
  vm.runInContext(script, vm.createContext(context));
}

export async function loadGulp(): Promise<GulpInst> {
  if (!_gulpInst) {
    const gulpFilePath = path.resolve('gulpfile.js');
    debug(`Using gulpfile: ${gulpFilePath}`);

    try {
      const gulpPath = require.resolve('gulp');
      debug(`Using gulp: ${gulpPath}`);
      _gulpInst = require(gulpPath);
    } catch (e: any) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }

      throw new Error(chalk.red(`Cannot find module 'gulp'`));
    }

    let gulpFile: any;
    try {
      gulpFile = require(gulpFilePath); // requiring the gulp file

    } catch (e: any) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }

      throw new Error(
        `Error in module: ${chalk.bold(prettyPath(gulpFilePath))}:\n` +
        chalk.red(e.stack ? e.stack : e)
      );
    }

    // If gulpfile exports some function, then declare this functions as Gulp tasks - Fix #4114
    const hasExportedFunctions = gulpFile && Object.keys(gulpFile)
      .findIndex(key => typeof gulpFile[key] === 'function') !== -1;
    if (hasExportedFunctions) {
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
      } catch (e: any) {
        throw new Error(`Cannot declare gulp v4 task, using exports: ${chalk.bold(prettyPath(gulpFilePath))}:\n` +
          chalk.red(e.stack ? e.stack : e));
      }
    }

    // No exported function: try to include the file, to be able to access to tasks declared inside the file - Fix #4516
    else {
      try {
        include(gulpFilePath);

      } catch (e: any) {
        throw new Error(
          `Error in module: ${chalk.bold(prettyPath(gulpFilePath))}:\n` +
          chalk.red(e.stack ? e.stack : e)
        );
      }
    }

    const gulpTasks = await tasks(_gulpInst);
    if (!gulpTasks.length) {
      // Incompatible gulp file (e.g. when using gulp v3): failed
      throw new Error(`No task found in your gulpfile.js\n- Make sure your gulpfile.js is compatible with Gulp v4, and upgrade if not (see https://zzz.buzz/2016/11/19/gulp-4-0-upgrade-guide/)\n- Or downgrade @ionic/v1-toolkit to <= 3.2.0.`);
    }

    debug('Loaded gulp tasks: %o', gulpTasks);
  }

  return _gulpInst;
}
export async function tasks(gulpInst?: GulpInst): Promise<string[]> {
  try {
    const gulp = gulpInst || await loadGulp();
    const registry = gulp.registry();
    return registry && Object.keys(registry.tasks()) || [];

  } catch (e: any) {
    process.stderr.write(`${timestamp()} Cannot load gulp tasks: ${chalk.bold(String(e))}\n` +
      chalk.red(e.stack ? e.stack : e));
    return [];
  }
}

export async function hasTask(name: string): Promise<boolean> {
  try {
    return (await tasks()).includes(name);
  } catch (e: any) {
    process.stderr.write(`${timestamp()} Cannot load gulp: ${chalk.bold(String(e))}\n` +
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
  } catch (e: any) {
    process.stderr.write(`${timestamp()} Cannot run ${chalk.cyan(name)} task: ${String(e)}\n` +
      chalk.red(e.stack ? e.stack : e));
  }
}
