import * as path from 'path';

import chalk from 'chalk';
import * as gulpType from 'gulp';

import { IonicEnvironment } from '../definitions';
import { FatalException } from './errors';
import { promisify } from '@ionic/cli-framework/utils/promise';

let _gulpInst: typeof gulpType;

export async function loadGulp(env: IonicEnvironment): Promise<typeof gulpType> {
  const { prettyPath } = await import('./utils/format');
  const { pkgManagerArgs } = await import('./utils/npm');

  const project = await env.project.load();

  if (typeof project.integrations.gulp === 'undefined' || project.integrations.gulp.enabled === false) {
    throw new FatalException('Not attempting to load gulp from a project with gulp integration disabled.');
  }

  const gulpFilePath = path.join(env.project.directory, project.integrations.gulp.file ? project.integrations.gulp.file : 'gulpfile.js');
  const gulpPath = path.join(env.project.directory, 'node_modules', 'gulp');

  try {
    _gulpInst = require(gulpPath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    const gulpInstallArgs = await pkgManagerArgs(env, { pkg: 'gulp', saveDev: true, saveExact: false });

    throw new FatalException(
      `Gulp is not installed! You can install it locally:\n\n` +
      `    ${chalk.green(gulpInstallArgs.join(' '))}\n\n` +
      `Or, if you don't use gulp, you can disable it by running ${chalk.green('ionic config set gulp.enabled false')}.\n`
    );
  }

  try {
    require(gulpFilePath); // requiring the gulp file sets up the gulp instance with local gulp task definitions
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    throw new FatalException(
      `Gulpfile (or dependent module) not found: ${chalk.bold(prettyPath(gulpFilePath))}\n` +
      `For custom Gulpfile locations, you can run ${chalk.green('ionic config set gulp.file <path>')}. Otherwise, the default Ionic Gulpfile can be downloaded from ${chalk.bold('https://github.com/ionic-team/ionic-app-base/blob/master/gulpfile.js')}\n\n` +
      `Or, if you don't use gulp, you can disable it by running ${chalk.green('ionic config set gulp.enabled false')}.\n` +
      `Full error:\n\n` +
      chalk.red(e.stack ? e.stack : e)
    );
  }

  return _gulpInst;
}

export async function getGulpVersion(env: IonicEnvironment): Promise<string | undefined> {
  let gulpVersion = await env.shell.cmdinfo('gulp', ['--version']);

  if (gulpVersion) {
    gulpVersion = gulpVersion.replace(/\[[\d\:]+\]\s/g, '');
    gulpVersion = gulpVersion.trim();
  }

  return gulpVersion;
}

export async function checkGulp(env: IonicEnvironment) {
  const project = await env.project.load();

  if (!project.integrations.gulp) {
    env.log.info('Enabling Gulp integration.');
    await env.runCommand(['config', 'set', 'integrations.gulp', '{}', '--json', '--force']);
  }
}

export async function runTask(env: IonicEnvironment, name: string): Promise<void> {
  const project = await env.project.load();

  if (project.integrations.gulp && project.integrations.gulp.enabled !== false) {
    const gulp = await loadGulp(env);
    const gulpStart = promisify<void, string>(gulp.start.bind(gulp));

    if (gulp.hasTask(name)) {
      env.log.debug(() => `Invoking ${chalk.cyan(name)} gulp task.`);
      try {
        await gulpStart(name);
      } catch (e) {
        env.log.error(`Error occurred during ${chalk.cyan(name)} gulp task. Use ${chalk.green('--verbose')} to show details.`);
        throw e;
      }
    }
  }
}

export async function registerWatchEvents(env: IonicEnvironment) {
  const project = await env.project.load();

  if (project.integrations.gulp && project.integrations.gulp.enabled !== false) {
    const gulp = await loadGulp(env);

    env.events.on('watch:init', async () => {
      if (!gulp.hasTask('sass')) {
        env.log.warn(`The ${chalk.cyan('sass')} task not found in your Gulpfile, which is used to compile SCSS files. The default Ionic Gulpfile can be downloaded from ${chalk.bold('https://github.com/ionic-team/ionic-app-base/blob/master/gulpfile.js')}`);
      }
    });

    env.events.on('watch:change', async (filePath) => {
      if (path.extname(filePath) === '.scss') {
        await runTask(env, 'sass');
      }
    });
  }
}
