import * as path from 'path';
import * as util from 'util';

import chalk from 'chalk';

import {
  IHookEngine,
  InfoHookItem,
  RootPlugin,
  generateIonicEnvironment,
} from '@ionic/cli-utils';

import { Exception } from '@ionic/cli-utils/lib/errors';
import { mapLegacyCommand, modifyArguments, parseArgs } from '@ionic/cli-utils/lib/init';
import { pathExists } from '@ionic/cli-framework/utils/fs';
import { isExitCodeException } from '@ionic/cli-utils/guards';

import { IonicNamespace } from './commands';

const name = 'ionic';
export const namespace = new IonicNamespace();

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'info', async ({ env, project }) => {
    const osName = await import('os-name');
    const os = osName();
    const node = process.version;

    const npm = await env.shell.cmdinfo('npm', ['-v']);
    const config = await env.config.load();

    const info: InfoHookItem[] = [
      { type: 'cli-packages', key: name, flair: 'Ionic CLI', value: env.plugins.ionic.meta.version, path: path.dirname(path.dirname(env.plugins.ionic.meta.filePath)) },
      { type: 'system', key: 'Node', value: node },
      { type: 'system', key: 'npm', value: npm || 'not installed' },
      { type: 'system', key: 'OS', value: os },
      { type: 'misc', key: 'backend', value: config.backend },
    ];

    const projectFile = project.directory ? await project.load() : undefined;

    if (projectFile) {
      if (projectFile.type === 'ionic1') {
        const { getIonic1Version } = await import('@ionic/cli-utils/lib/ionic1/utils');
        const ionic1Version = await getIonic1Version(env);
        info.push({ type: 'local-packages', key: 'Ionic Framework', value: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' });
      } else if (projectFile.type === 'ionic-angular') {
        const { getIonicAngularVersion, getAppScriptsVersion } = await import('@ionic/cli-utils/lib/ionic-angular/utils');
        const [ ionicAngularVersion, appScriptsVersion ] = await Promise.all([getIonicAngularVersion(env, project), getAppScriptsVersion(env, project)]);
        info.push({ type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `ionic-angular ${ionicAngularVersion}` : 'not installed' });
        info.push({ type: 'local-packages', key: '@ionic/app-scripts', value: appScriptsVersion ? appScriptsVersion : 'not installed' });
      }

      if (projectFile.integrations.cordova && projectFile.integrations.cordova.enabled !== false) {
        const { getAndroidSdkToolsVersion } = await import('@ionic/cli-utils/lib/android');
        const { getCordovaCLIVersion, getCordovaPlatformVersions } = await import('@ionic/cli-utils/lib/cordova/utils');

        const [
          cordovaVersion,
          cordovaPlatforms,
          xcode,
          iosDeploy,
          iosSim,
          androidSdkToolsVersion,
        ] = await Promise.all([
          getCordovaCLIVersion(env),
          getCordovaPlatformVersions(env),
          env.shell.cmdinfo('xcodebuild', ['-version']),
          env.shell.cmdinfo('ios-deploy', ['--version']),
          env.shell.cmdinfo('ios-sim', ['--version']),
          getAndroidSdkToolsVersion(),
        ]);

        info.push({ type: 'global-packages', key: 'cordova', flair: 'Cordova CLI', value: cordovaVersion || 'not installed' });
        info.push({ type: 'local-packages', key: 'Cordova Platforms', value: cordovaPlatforms || 'none' });

        if (xcode) {
          info.push({ type: 'system', key: 'Xcode', value: xcode });
        }

        if (iosDeploy) {
          info.push({ type: 'system', key: 'ios-deploy', value: iosDeploy });
        }

        if (iosSim) {
          info.push({ type: 'system', key: 'ios-sim', value: iosSim });
        }

        if (androidSdkToolsVersion) {
          info.push({ type: 'system', key: 'Android SDK Tools', value: androidSdkToolsVersion });
        }

        info.push({ type: 'environment', key: 'ANDROID_HOME', value: process.env.ANDROID_HOME || 'not set' });
      }

      if (projectFile.integrations.gulp && projectFile.integrations.gulp.enabled !== false) {
        const { getGulpVersion } = await import('@ionic/cli-utils/lib/gulp');
        const gulpVersion = await getGulpVersion(env);
        info.push({ type: 'global-packages', key: 'Gulp CLI', value: gulpVersion || 'not installed globally' });
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

export async function generateRootPlugin(): Promise<RootPlugin> {
  const { getPluginMeta } = await import('@ionic/cli-utils/lib/plugins');

  return {
    namespace,
    registerHooks,
    meta: await getPluginMeta(__filename),
  };
}

export async function run(pargv: string[], env: { [k: string]: string; }) {
  const now = new Date();
  let err: any;

  pargv = modifyArguments(pargv.slice(2));
  env['IONIC_CLI_LIB'] = __filename;

  const { isSuperAgentError } = await import('@ionic/cli-utils/guards');
  const { isValidationErrorArray } = await import('@ionic/cli-framework/guards');

  const plugin = await generateRootPlugin();
  const ienv = await generateIonicEnvironment(plugin, pargv, env);

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
        if (await ienv.config.isUpdatingEnabled()) {
          const { checkForDaemon } = await import('@ionic/cli-utils/lib/daemon');
          await checkForDaemon(ienv);

          const { checkForUpdates, getLatestPluginVersion, versionNeedsUpdating } = await import('@ionic/cli-utils/lib/plugins');
          const latestVersion = await getLatestPluginVersion(ienv, plugin.meta.name, plugin.meta.version);

          if (latestVersion) {
            plugin.meta.latestVersion = latestVersion;
            plugin.meta.updateAvailable = await versionNeedsUpdating(plugin.meta.version, latestVersion);

            await checkForUpdates(ienv);
          }
        }
      }

      await ienv.hooks.fire('plugins:init', { env: ienv });
      await namespace.runCommand(ienv, pargv);
      config.state.lastCommand = now.toISOString();
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
    process.exitCode = 1;

    if (isValidationErrorArray(err)) {
      for (let e of err) {
        ienv.log.error(e.message);
      }
      ienv.log.msg(`Use the ${chalk.green('--help')} flag for more details.`);
    } else if (isSuperAgentError(err)) {
      const { formatSuperAgentError } = await import('@ionic/cli-utils/lib/http');
      ienv.log.msg(formatSuperAgentError(err));
    } else if (err.code && err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      ienv.log.error(
        `Network connectivity error occurred, are you offline?\n` +
        `If you are behind a firewall and need to configure proxy settings, see: ${chalk.bold('https://ionicframework.com/docs/cli/configuring.html#using-a-proxy')}\n\n` +
        chalk.red(String(err.stack ? err.stack : err))
      );
    } else if (isExitCodeException(err)) {
      process.exitCode = err.exitCode;

      if (err.message) {
        if (err.exitCode > 0) {
          ienv.log.error(err.message);
        } else {
          ienv.log.msg(err.message);
        }
      }
    } else if (err instanceof Exception) {
      ienv.log.error(err.message);
    } else {
      ienv.log.msg(chalk.red(String(err.stack ? err.stack : err)));

      if (err.stack) {
        ienv.log.debug(() => chalk.red(String(err.stack)));
      }
    }
  }

  await ienv.close();
}
