import * as path from 'path';

import * as chalk from 'chalk';
import { FatalException, IonicEnvironment, IHookEngine, PROJECT_FILE, getCommandInfo, prettyPath } from '@ionic/cli-utils';

export const name = '__NAME__';
export const version = '__VERSION__';

let _gulpInst: any;

async function loadGulp(env: IonicEnvironment) {
  if (_gulpInst || !env.project.directory) {
    return;
  }

  const project = await env.project.load();

  if (!project.gulpFile) {
    project.gulpFile = 'gulpfile.js';
  }

  const gulpFilePath = path.join(env.project.directory, project.gulpFile);
  const gulpPath = path.join(env.project.directory, 'node_modules', 'gulp');

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
      `    ${chalk.green('npm uninstall @ionic/cli-plugin-gulp')}`
    );
  }

  try {
    const gulp = require(gulpPath);
    _gulpInst = gulp;
    return gulp;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }

    throw new FatalException(
      `Gulp is not installed! You can install it locally:\n\n` +
      `    ${chalk.green('npm install gulp')}\n\n` +
      `Or, if you no longer use gulp, you can remove the CLI Gulp Plugin:\n\n` +
      `    ${chalk.green('npm uninstall @ionic/cli-plugin-gulp')}`
    );
  }
}

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'plugins:init', async ({ env }) => {
    const gulp = await loadGulp(env);
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
