import * as path from 'path';
import * as util from 'util';

import chalk from 'chalk';

import {
  IHookEngine,
  InfoHookItem,
  IonicEnvironment,
  RootPlugin,
  generateIonicEnvironment,
} from '@ionic/cli-utils';

import { mapLegacyCommand, modifyArguments, parseArgs } from '@ionic/cli-utils/lib/init';
import { pathExists } from '@ionic/cli-framework/utils/fs';
import { isExitCodeException } from '@ionic/cli-utils/guards';

import { IonicNamespace } from './commands';

const name = 'ionic';
export const namespace = new IonicNamespace();

const BUILD_BEFORE_HOOK = 'build:before';
const BUILD_BEFORE_SCRIPT = `ionic:${BUILD_BEFORE_HOOK}`;
const BUILD_AFTER_HOOK = 'build:after';
const BUILD_AFTER_SCRIPT = `ionic:${BUILD_AFTER_HOOK}`;

const WATCH_BEFORE_HOOK = 'watch:before';
const WATCH_BEFORE_SCRIPT = `ionic:${WATCH_BEFORE_HOOK}`;

export function registerHooks(hooks: IHookEngine) {
  const detectAndWarnAboutDeprecatedPlugin = async (env: IonicEnvironment, plugin: string) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.devDependencies && packageJson.devDependencies[plugin]) {
      const { pkgManagerArgs } = await import('@ionic/cli-utils/lib/utils/npm');
      const args = await pkgManagerArgs(env, { pkg: plugin, command: 'uninstall', saveDev: true });

      env.log.warn(
        `Detected ${chalk.bold(plugin)} in your ${chalk.bold('package.json')}.\n` +
        `As of CLI 3.8, it is no longer needed. You can uninstall it:\n\n${chalk.green(args.join(' '))}\n`
      );
    }
  };

  hooks.register(name, BUILD_BEFORE_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[BUILD_BEFORE_SCRIPT]) {
      env.log.debug(() => `Invoking ${chalk.cyan(BUILD_BEFORE_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', BUILD_BEFORE_SCRIPT], { showExecution: true });
    }

    if (packageJson.devDependencies) {
      if (packageJson.devDependencies['gulp']) {
        const { checkGulp, runTask } = await import('@ionic/cli-utils/lib/gulp');
        await checkGulp(env);
        await runTask(env, BUILD_BEFORE_SCRIPT);
      }

      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-cordova');
      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-ionic-angular');
      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-ionic1');
      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-gulp');

      if (packageJson.devDependencies['@ionic/cli-plugin-cordova']) {
        const { checkCordova } = await import('@ionic/cli-utils/lib/cordova/utils');
        await checkCordova(env);
      }
    }
  });

  hooks.register(name, BUILD_AFTER_HOOK, async ({ env, platform }) => {
    const [ project, packageJson ] = await Promise.all([env.project.load(), env.project.loadPackageJson()]);

    if (packageJson.scripts && packageJson.scripts[BUILD_AFTER_SCRIPT]) {
      env.log.debug(() => `Invoking ${chalk.cyan(BUILD_AFTER_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', BUILD_AFTER_SCRIPT], { showExecution: true });
    }

    if (packageJson.devDependencies) {
      if (packageJson.devDependencies['gulp']) {
        const { checkGulp, runTask } = await import('@ionic/cli-utils/lib/gulp');
        await checkGulp(env);
        await runTask(env, BUILD_AFTER_SCRIPT);
      }
    }

    if (project.integrations.cordova && project.integrations.cordova.enabled !== false) {
      const { BuildCommand } = await import('./commands/build');
      const cordovaPrepareArgs = ['cordova', 'prepare'];

      if (platform) {
        cordovaPrepareArgs.push(platform);
      }

      if (env.command instanceof BuildCommand) {
        await env.runCommand(cordovaPrepareArgs);
      }
    }
  });

  hooks.register(name, WATCH_BEFORE_HOOK, async ({ env }) => {
    const packageJson = await env.project.loadPackageJson();

    if (packageJson.scripts && packageJson.scripts[WATCH_BEFORE_SCRIPT]) {
      env.log.debug(() => `Invoking ${chalk.cyan(WATCH_BEFORE_SCRIPT)} npm script.`);
      await env.shell.run('npm', ['run', WATCH_BEFORE_SCRIPT], { showExecution: true });
    }

    if (packageJson.devDependencies) {
      if (packageJson.devDependencies['gulp']) {
        const { checkGulp, registerWatchEvents, runTask } = await import('@ionic/cli-utils/lib/gulp');
        await checkGulp(env);
        await registerWatchEvents(env);
        await runTask(env, WATCH_BEFORE_SCRIPT);
      }

      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-cordova');
      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-ionic-angular');
      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-ionic1');
      await detectAndWarnAboutDeprecatedPlugin(env, '@ionic/cli-plugin-gulp');

      if (packageJson.devDependencies['@ionic/cli-plugin-cordova']) {
        const { checkCordova } = await import('@ionic/cli-utils/lib/cordova/utils');
        await checkCordova(env);
      }
    }
  });

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
      await namespace.runCommand(ienv, pargv, { root: true });
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
    } else if (isExitCodeException(err)) {
      process.exitCode = err.exitCode;

      if (err.message) {
        if (err.exitCode > 0) {
          ienv.log.error(err.message);
        } else {
          ienv.log.msg(err.message);
        }
      }
    } else {
      ienv.log.msg(chalk.red(String(err.stack ? err.stack : err)));

      if (err.stack) {
        ienv.log.debug(() => chalk.red(String(err.stack)));
      }
    }
  }

  await ienv.close();
}
