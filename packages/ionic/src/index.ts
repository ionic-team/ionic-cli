import * as path from 'path';

import * as minimist from 'minimist';
import * as chalk from 'chalk';

import {
  IHookEngine,
  InfoHookItem,
  checkForUpdates,
  formatSuperAgentError,
  generateIonicEnvironment,
  getCommandInfo,
  isSuperAgentError,
  isValidationErrorArray,
  loadPlugins,
  pathExists,
  pkgManagerArgs,
} from '@ionic/cli-utils';

import { IonicNamespace } from './commands';
import { mapLegacyCommand, modifyArguments } from './lib/init';
import { load } from './lib/modules';

export const name = '__NAME__';
export const version = '__VERSION__';
export const namespace = new IonicNamespace();
export const meta = { filePath: __filename };

const BUILD_BEFORE_HOOK = 'build:before';
const BUILD_BEFORE_SCRIPT = `ionic:${BUILD_BEFORE_HOOK}`;
const BUILD_AFTER_HOOK = 'build:after';
const BUILD_AFTER_SCRIPT = `ionic:${BUILD_AFTER_HOOK}`;

const WATCH_BEFORE_HOOK = 'watch:before';
const WATCH_BEFORE_SCRIPT = `ionic:${WATCH_BEFORE_HOOK}`;

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, BUILD_BEFORE_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[BUILD_BEFORE_SCRIPT]) {
      env.log.debug(`Invoking ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', BUILD_BEFORE_SCRIPT], { showExecution: true });
    }
  });

  hooks.register(name, BUILD_AFTER_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[BUILD_AFTER_SCRIPT]) {
      env.log.debug(`Invoking ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', BUILD_AFTER_SCRIPT], { showExecution: true });
    }
  });

  hooks.register(name, WATCH_BEFORE_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[WATCH_BEFORE_SCRIPT]) {
      env.log.debug(`Invoking ${chalk.cyan(WATCH_BEFORE_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', WATCH_BEFORE_SCRIPT], { showExecution: true });
    }
  });

  hooks.register(name, 'command:info', async () => {
    const osName = load('os-name');
    const os = osName();
    const node = process.version;

    const { getAndroidSdkToolsVersion } = await import('./lib/android');

    const [
      npm,
      xcode,
      iosDeploy,
      iosSim,
      androidSdkToolsVersion,
    ] = await Promise.all([
      getCommandInfo('npm', ['-v']),
      getCommandInfo('/usr/bin/xcodebuild', ['-version']),
      getCommandInfo('ios-deploy', ['--version']),
      getCommandInfo('ios-sim', ['--version']),
      getAndroidSdkToolsVersion(),
    ]);

    const info: InfoHookItem[] = [ // TODO: why must I be explicit?
      { type: 'global-packages', name: 'Ionic CLI', version: version },
      { type: 'system', name: 'Node', version: node },
      { type: 'system', name: 'npm', version: npm || 'not installed' },
      { type: 'system', name: 'OS', version: os },
    ];

    if (xcode) {
      info.push({ type: 'system', name: 'Xcode', version: xcode });
    }

    if (iosDeploy) {
      info.push({ type: 'system', name: 'ios-deploy', version: iosDeploy });
    }

    if (iosSim) {
      info.push({ type: 'system', name: 'ios-sim', version: iosSim });
    }

    if (androidSdkToolsVersion) {
      info.push({ type: 'system', name: 'Android SDK Tools', version: androidSdkToolsVersion });
    }

    return info;
  });
}


export async function run(pargv: string[], env: { [k: string]: string }) {
  const now = new Date();
  let exitCode = 0;
  let err: any;

  env['IONIC_CLI_LIB'] = __filename;

  const ienv = await generateIonicEnvironment(exports, modifyArguments(pargv.slice(2)), env);
  registerHooks(ienv.hooks);

  try {
    const configData = await ienv.config.load();

    if (ienv.argv['log-level']) {
      ienv.log.level = ienv.argv['log-level'];
    }

    if (env['IONIC_EMAIL'] && env['IONIC_PASSWORD']) {
      ienv.log.debug(`${chalk.bold('IONIC_EMAIL')} / ${chalk.bold('IONIC_PASSWORD')} environment variables detected`);

      if (configData.user.email !== env['IONIC_EMAIL']) {
        ienv.log.debug(`${chalk.bold('IONIC_EMAIL')} mismatch with current session--attempting login`);

        try {
          await ienv.session.login(env['IONIC_EMAIL'], env['IONIC_PASSWORD']);
        } catch (e) {
          ienv.log.error(`Error occurred during automatic login via ${chalk.bold('IONIC_EMAIL')} / ${chalk.bold('IONIC_PASSWORD')} environment variables.`);
          throw e;
        }
      }
    }

    if (ienv.project.directory) {
      const nodeModulesExists = await pathExists(path.join(ienv.project.directory, 'node_modules'));

      if (!nodeModulesExists) {
        const confirm = await ienv.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Looks like a fresh checkout! No ${chalk.green('./node_modules')} directory found. Would you like to install project dependencies?`,
        });

        if (confirm) {
          ienv.log.info('Installing dependencies may take several minutes!');
          const [ installer, ...installerArgs ] = await pkgManagerArgs(ienv, { command: 'install' });
          await ienv.shell.run(installer, installerArgs, {});
        }
      }
    }

    // If an legacy command is being executed inform the user that there is a new command available
    const foundCommand = mapLegacyCommand(ienv.argv._[0]);
    if (foundCommand) {
      ienv.log.msg(`The ${chalk.green(ienv.argv._[0])} command has been renamed. To find out more, run:\n\n` +
                   `  ${chalk.green(`ionic ${foundCommand} --help`)}\n\n`);
    } else {
      let updates: undefined | string[];

      try {
        await loadPlugins(ienv);
      } catch (e) {
        if (e.fatal) {
          throw e;
        }

        ienv.log.error(chalk.red.bold('Error occurred while loading plugins. CLI functionality may be limited.\nChecking for CLI updates now...'));
        ienv.log.debug(chalk.red(chalk.bold('Plugin error: ') + (e.stack ? e.stack : e)));
        updates = await checkForUpdates(ienv);

        if (updates.length === 0) {
          ienv.log.error('No updates found after plugin error--please report this issue.');
        }
      }

      await ienv.hooks.fire('plugins:init', { env: ienv });

      if (configData.cliFlags['dev-always-ionic-updates'] || configData.cliFlags['dev-always-plugin-updates'] || (typeof updates === 'undefined' && now.getTime() - new Date(configData.lastCommand).getTime() >= 3600000)) {
        await checkForUpdates(ienv);
      }

      await namespace.runCommand(ienv);

      configData.lastCommand = now.toISOString();
    }

  } catch (e) {
    ienv.log.debug(chalk.red.bold('!!! ERROR ENCOUNTERED !!!'));
    err = e;
  }

  try {
    await Promise.all([ienv.config.save(), ienv.project.save()]);
  } catch (e) {
    ienv.log.error(e);
  }

  if (err) {
    ienv.tasks.fail();
    exitCode = 1;

    if (isValidationErrorArray(err)) {
      for (let e of err) {
        ienv.log.error(e.message);
      }
      ienv.log.msg(`Use the ${chalk.green('--help')} flag for more details.`);
    } else if (isSuperAgentError(err)) {
      ienv.log.msg(formatSuperAgentError(err));
    } else if (err.fatal) {
      exitCode = typeof err.exitCode === 'number' ? err.exitCode : 1;

      if (err.message) {
        if (exitCode > 0) {
          ienv.log.error(err.message);
        } else {
          ienv.log.msg(err.message);
        }
      }
    } else {
      ienv.log.msg(chalk.red(String(err)));

      if (err.stack) {
        ienv.log.debug(chalk.red(err.stack));
      }
    }

    process.exit(exitCode);
  }

  ienv.close();
}
