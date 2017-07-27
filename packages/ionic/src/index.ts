import * as path from 'path';
import * as util from 'util';

import * as minimist from 'minimist';
import * as chalk from 'chalk';

import {
  IHookEngine,
  InfoHookItem,
  checkForDaemon,
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
      env.log.debug(() => `Invoking ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', BUILD_BEFORE_SCRIPT], { showExecution: true });
    }
  });

  hooks.register(name, BUILD_AFTER_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[BUILD_AFTER_SCRIPT]) {
      env.log.debug(() => `Invoking ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', BUILD_AFTER_SCRIPT], { showExecution: true });
    }
  });

  hooks.register(name, WATCH_BEFORE_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[WATCH_BEFORE_SCRIPT]) {
      env.log.debug(() => `Invoking ${chalk.cyan(WATCH_BEFORE_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', WATCH_BEFORE_SCRIPT], { showExecution: true });
    }
  });

  hooks.register(name, 'command:info', async () => {
    const osName = await import('os-name');
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
      { type: 'cli-packages', name: `${name} ${chalk.dim('(Ionic CLI)')}`, version, path: path.dirname(path.dirname(__filename)) },
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


export async function run(pargv: string[], env: { [k: string]: string; }) {
  const now = new Date();
  let exitCode = 0;
  let err: any;

  pargv = modifyArguments(pargv.slice(2));
  env['IONIC_CLI_LIB'] = __filename;

  const ienv = await generateIonicEnvironment(exports, pargv, env);

  try {
    const config = await ienv.config.load();

    registerHooks(ienv.hooks);

    ienv.log.debug(() => util.inspect(ienv.meta, { breakLength: Infinity, colors: chalk.enabled }));

    if (env['IONIC_EMAIL'] && env['IONIC_PASSWORD']) {
      ienv.log.debug(() => `${chalk.bold('IONIC_EMAIL')} / ${chalk.bold('IONIC_PASSWORD')} environment variables detected`);

      if (config.user.email !== env['IONIC_EMAIL']) {
        ienv.log.debug(() => `${chalk.bold('IONIC_EMAIL')} mismatch with current session--attempting login`);

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

    const argv = minimist(pargv, { boolean: true, string: '_' });

    // If an legacy command is being executed inform the user that there is a new command available
    const foundCommand = mapLegacyCommand(argv._[0]);
    if (foundCommand) {
      ienv.log.msg(`The ${chalk.green(argv._[0])} command has been renamed. To find out more, run:\n\n` +
                   `  ${chalk.green(`ionic ${foundCommand} --help`)}\n\n`);
    } else {
      try {
        await loadPlugins(ienv);
      } catch (e) {
        if (e.fatal) {
          throw e;
        }

        ienv.log.error(chalk.red.bold('Error occurred while loading plugins. CLI functionality may be limited.'));
        ienv.log.debug(() => chalk.red(chalk.bold('Plugin error: ') + (e.stack ? e.stack : e)));
      }

      if (ienv.flags.interactive) {
        if (typeof config.daemon.updates === 'undefined') {
          const confirm = await ienv.prompt({
            type: 'confirm',
            name: 'confirm',
            message: `The Ionic CLI can automatically check for CLI updates in the background. Would you like to enable this?`,
          });

          config.daemon.updates = confirm;
          await ienv.config.save();
        }

        if (config.daemon.updates) {
          await Promise.all([checkForDaemon(ienv), checkForUpdates(ienv)]);
        }
      }

      await ienv.hooks.fire('plugins:init', { env: ienv });

      const r = await namespace.runCommand(ienv, pargv);

      if (typeof r === 'number') {
        exitCode = r;
      }

      config.lastCommand = now.toISOString();
    }

  } catch (e) {
    err = e;
  }

  try {
    await Promise.all([
      ienv.config.save(),
      ienv.project.save(),
      ienv.daemon.save(),
    ]);
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
        ienv.log.debug(() => chalk.red(err.stack));
      }
    }
  }

  ienv.close();

  if (exitCode > 0) {
    process.exit(exitCode);
  }
}
