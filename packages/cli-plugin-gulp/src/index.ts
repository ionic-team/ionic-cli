import * as path from 'path';

import * as chalk from 'chalk';
import * as gulpType from 'gulp';

import {
  FatalException,
  IHookEngine,
  IonicEnvironment,
  PROJECT_FILE,
  getCommandInfo,
  pkgInstallPluginArgs,
  pkgManagerArgs,
  prettyPath,
  promisify,
} from '@ionic/cli-utils';

export const name = '__NAME__';
export const version = '__VERSION__';

const BUILD_BEFORE_HOOK = 'build:before';
const BUILD_BEFORE_TASK = `ionic:${BUILD_BEFORE_HOOK}`;
const BUILD_AFTER_HOOK = 'build:after';
const BUILD_AFTER_TASK = `ionic:${BUILD_AFTER_HOOK}`;

const WATCH_BEFORE_HOOK = 'watch:before';
const WATCH_BEFORE_TASK = `ionic:${WATCH_BEFORE_HOOK}`;

const SASS_TASK = 'sass';

let _gulpInst: typeof gulpType;

async function loadGulp(env: IonicEnvironment): Promise<typeof gulpType | undefined> {
  if (_gulpInst || !env.project.directory) {
    return _gulpInst;
  }

  const project = await env.project.load();

  if (!project.gulpFile) {
    project.gulpFile = 'gulpfile.js';
  }

  const gulpFilePath = path.join(env.project.directory, project.gulpFile);
  const gulpPath = path.join(env.project.directory, 'node_modules', 'gulp');
  const gulpPluginUninstallArgs = await pkgInstallPluginArgs(env, '@ionic/cli-plugin-gulp', { command: 'uninstall' });

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
      `Or, if you no longer use gulp, you can remove the CLI Gulp Plugin:\n\n` +
      `    ${chalk.green(gulpPluginUninstallArgs.join(' '))}`
    );
  }

  try {
    const gulpFile = require(gulpFilePath);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    throw new FatalException(
      `Gulpfile not found: ${chalk.bold(prettyPath(gulpFilePath))}\n` +
      `You can set the ${chalk.bold('gulpFile')} attribute in ${chalk.bold(PROJECT_FILE)} for custom Gulpfile locations, otherwise the default Ionic Gulpfile can be downloaded from ${chalk.bold('https://github.com/ionic-team/ionic-app-base/blob/master/gulpfile.js')}\n\n` +
      `Or, if you no longer use gulp, you can remove the CLI Gulp Plugin:\n\n` +
      `    ${chalk.green(gulpPluginUninstallArgs.join(' '))}`
    );
  }

  return _gulpInst;
}

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'plugins:init', async ({ env }) => {
    env.events.on('watch:init', async () => {
      const gulp = await loadGulp(env);

      if (gulp) {
        if (!gulp.hasTask(SASS_TASK)) {
          env.log.warn(`The ${chalk.cyan(SASS_TASK)} task not found in your Gulpfile, which is used to compile SCSS files. The default Ionic Gulpfile can be downloaded from ${chalk.bold('https://github.com/ionic-team/ionic-app-base/blob/master/gulpfile.js')}`);
        }

        if (!gulp.hasTask(BUILD_BEFORE_TASK)) {
          env.log.debug(`No ${chalk.cyan(BUILD_BEFORE_TASK)} task found in Gulpfile.`);
        }

        if (!gulp.hasTask(BUILD_AFTER_TASK)) {
          env.log.debug(`No ${chalk.cyan(BUILD_AFTER_TASK)} task found in Gulpfile.`);
        }

        if (!gulp.hasTask(WATCH_BEFORE_TASK)) {
          env.log.debug(`No ${chalk.cyan(WATCH_BEFORE_TASK)} task found in Gulpfile.`);
        }
      }
    });

    env.events.on('watch:change', async (filePath) => {
      const gulp = await loadGulp(env);

      if (gulp) {
        const gulpStart = promisify<void, string>(gulp.start.bind(gulp));

        if (gulp.hasTask(SASS_TASK)) {
          if (path.extname(filePath) === '.scss') {
            env.log.debug(`Invoking ${chalk.cyan(SASS_TASK)} gulp task.`);
            try {
              await gulpStart(SASS_TASK);
            } catch (e) {
              env.log.error(e);
            }
          }
        }
      }
    });
  });

  hooks.register(name, BUILD_BEFORE_HOOK, async ({ env }) => {
    const gulp = await loadGulp(env);

    if (gulp) {
      const gulpStart = promisify<void, string>(gulp.start.bind(gulp));

      if (gulp.hasTask(BUILD_BEFORE_TASK)) {
        env.log.debug(`Invoking ${chalk.cyan(BUILD_BEFORE_TASK)} gulp task.`);
        try {
          await gulpStart(BUILD_BEFORE_TASK);
        } catch (e) {
          env.log.error(`Error occurred during ${chalk.cyan(BUILD_BEFORE_TASK)} gulp task. Use ${chalk.green('--verbose')} to show details.`);
          throw e;
        }
      }
    }
  });

  hooks.register(name, BUILD_AFTER_HOOK, async ({ env }) => {
    const gulp = await loadGulp(env);

    if (gulp) {
      const gulpStart = promisify<void, string>(gulp.start.bind(gulp));

      if (gulp.hasTask(BUILD_AFTER_TASK)) {
        env.log.debug(`Invoking ${chalk.cyan(BUILD_AFTER_TASK)} gulp task.`);

        try {
          await gulpStart(BUILD_AFTER_TASK);
        } catch (e) {
          env.log.error(`Error occurred during ${chalk.cyan(BUILD_AFTER_TASK)} gulp task. Use ${chalk.green('--verbose')} to show details.`);
          throw e;
        }
      }
    }
  });

  hooks.register(name, WATCH_BEFORE_HOOK, async ({ env }) => {
    const gulp = await loadGulp(env);

    if (gulp) {
      const gulpStart = promisify<void, string>(gulp.start.bind(gulp));

      if (gulp.hasTask(WATCH_BEFORE_TASK)) {
        env.log.debug(`Invoking ${chalk.cyan(WATCH_BEFORE_TASK)} gulp task.`);
        try {
          await gulpStart(WATCH_BEFORE_TASK);
        } catch (e) {
          env.log.error(`Error occurred during ${chalk.cyan(WATCH_BEFORE_TASK)} gulp task. Use ${chalk.green('--verbose')} to show details.`);
          throw e;
        }
      }
    }
  });

  hooks.register(name, 'command:info', async ({ env }) => {
    let gulpVersion = await getCommandInfo('gulp', ['--version']);

    if (gulpVersion) {
      gulpVersion = gulpVersion.replace(/\[[\d\:]+\]\s/g, '');
      gulpVersion = gulpVersion.trim();
    }

    return [
      { type: 'global-packages', name: 'Gulp CLI', version: gulpVersion || 'not installed globally' },
      { type: 'local-packages', name, version },
    ];
  });
}
