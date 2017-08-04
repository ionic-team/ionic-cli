import * as path from 'path';
import * as util from 'util';

import * as chalk from 'chalk';

import {
  IHookEngine,
  InfoHookItem,
  generateIonicEnvironment,
} from '@ionic/cli-utils';

import { mapLegacyCommand, modifyArguments, parseArgs } from '@ionic/cli-utils/lib/init';
import { pathExists } from '@ionic/cli-utils/lib/utils/fs';

import { IonicNamespace } from './commands';

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

    if (packageJson.devDependencies && packageJson.devDependencies['gulp']) {
      const { runTask } = await import('@ionic/cli-utils/lib/gulp');
      await runTask(env, BUILD_BEFORE_SCRIPT);
    }
  });

  hooks.register(name, BUILD_AFTER_HOOK, async ({ env }) => {
    const [ project, packageJson ] = await Promise.all([env.project.load(), env.project.loadPackageJson()]);

    if (packageJson.scripts && packageJson.scripts[BUILD_AFTER_SCRIPT]) {
      env.log.debug(() => `Invoking ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', BUILD_AFTER_SCRIPT], { showExecution: true });
    }

    if (packageJson.devDependencies && packageJson.devDependencies['gulp']) {
      const { runTask } = await import('@ionic/cli-utils/lib/gulp');
      await runTask(env, BUILD_AFTER_SCRIPT);
    }

    if (project.platforms.cordova && project.platforms.cordova.enabled) {
      await env.runcmd(['cordova', 'prepare']);
    }
  });

  hooks.register(name, WATCH_BEFORE_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[WATCH_BEFORE_SCRIPT]) {
      env.log.debug(() => `Invoking ${chalk.cyan(WATCH_BEFORE_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', WATCH_BEFORE_SCRIPT], { showExecution: true });
    }

    if (packageJson.devDependencies && packageJson.devDependencies['gulp']) {
      const { registerWatchEvents, runTask } = await import('@ionic/cli-utils/lib/gulp');
      await registerWatchEvents(env);
      await runTask(env, WATCH_BEFORE_SCRIPT);
    }
  });

  hooks.register(name, 'info', async ({ env }) => {
    const osName = await import('os-name');
    const os = osName();
    const node = process.version;

    const { getCommandInfo } = await import('@ionic/cli-utils/lib/utils/shell');
    const { getAndroidSdkToolsVersion } = await import('@ionic/cli-utils/lib/android');

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

    const project = env.project.directory ? await env.project.load() : undefined;

    if (project) {
      const packageJson = await env.project.loadPackageJson();

      if (project.type === 'ionic1') {
        const { getIonic1Version } = await import('@ionic/cli-utils/lib/ionic1/utils');
        const ionic1Version = await getIonic1Version(env);
        info.push({ type: 'local-packages', name: 'Ionic Framework', version: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' });
      } else if (project.type === 'ionic-angular') {
        const { getIonicAngularVersion, getAppScriptsVersion } = await import('@ionic/cli-utils/lib/ionic-angular/utils');
        const [ ionicAngularVersion, appScriptsVersion ] = await Promise.all([getIonicAngularVersion(env), getAppScriptsVersion(env)]);
        info.push({ type: 'local-packages', name: 'Ionic Framework', version: ionicAngularVersion ? `ionic-angular ${ionicAngularVersion}` : 'not installed' });
        info.push({ type: 'local-packages', name: '@ionic/app-scripts', version: appScriptsVersion ? appScriptsVersion : 'not installed' });
      }

      if (project.platforms.cordova && project.platforms.cordova.enabled) {
        const { getCordovaCLIVersion, getCordovaPlatformVersions } = await import('@ionic/cli-utils/lib/cordova/utils');
        const [ cordovaVersion, cordovaPlatforms ] = await Promise.all([getCordovaCLIVersion(), getCordovaPlatformVersions()]);
        info.push({ type: 'global-packages', name: 'Cordova CLI', version: cordovaVersion || 'not installed' });
        info.push({ type: 'local-packages', name: 'Cordova Platforms', version: cordovaPlatforms || 'none' });
      }

      if (packageJson.devDependencies && packageJson.devDependencies['gulp']) {
        const { getGulpVersion } = await import('@ionic/cli-utils/lib/gulp');
        const gulpVersion = await getGulpVersion();
        info.push({ type: 'global-packages', name: 'Gulp CLI', version: gulpVersion || 'not installed globally' });
      }
    }

    return info;
  });

  hooks.register(name, 'cordova:project:info', async ({ env }) => {
    const { ConfigXml } = await import('@ionic/cli-utils/lib/cordova/config');
    const conf = await ConfigXml.load(env.project.directory);
    return conf.getProjectInfo();
  });
}


export async function run(pargv: string[], env: { [k: string]: string; }) {
  const now = new Date();
  let exitCode = 0;
  let err: any;

  pargv = modifyArguments(pargv.slice(2));
  env['IONIC_CLI_LIB'] = __filename;

  const { isSuperAgentError, isValidationErrorArray } = await import('@ionic/cli-utils/guards');

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
          const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');
          const [ installer, ...installerArgs ] = await pkgManagerArgs(ienv, { command: 'install' });
          await ienv.shell.run(installer, installerArgs, {});
        }
      }
    }

    const argv = parseArgs(pargv, { boolean: true, string: '_' });

    // If an legacy command is being executed inform the user that there is a new command available
    const foundCommand = mapLegacyCommand(argv._[0]);
    if (foundCommand) {
      ienv.log.msg(`The ${chalk.green(argv._[0])} command has been renamed. To find out more, run:\n\n` +
                   `  ${chalk.green(`ionic ${foundCommand} --help`)}\n\n`);
    } else {
      const { loadPlugins } = await import ('@ionic/cli-utils/lib/plugins');

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
          const { checkForDaemon } = await import('@ionic/cli-utils/lib/daemon');
          const { checkForUpdates } = await import('@ionic/cli-utils/lib/plugins');

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
      const { formatSuperAgentError } = await import('@ionic/cli-utils/lib/http');
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
