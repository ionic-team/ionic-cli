import * as util from 'util';
import * as path from 'path';

import chalk from 'chalk';
import { isCI } from 'ci-info';
import { parseArgs } from '@ionic/cli-framework/lib';
import { findBaseDirectory } from '@ionic/cli-framework/utils/fs';

import * as inquirerType from 'inquirer';

import {
  IClient,
  IConfig,
  IHookEngine,
  IProject,
  ISession,
  InfoHookItem,
  IonicEnvironment,
  LogLevel,
  LogPrefix,
  RootPlugin,
} from './definitions';

import { LOG_LEVELS, isLogLevel } from './guards';

import { ERROR_VERSION_TOO_OLD } from './bootstrap';
import { BACKEND_LEGACY } from './lib/backends';
import { CONFIG_FILE, Config, DEFAULT_CONFIG_DIRECTORY, gatherFlags } from './lib/config';
import { DAEMON_JSON_FILE, Daemon } from './lib/daemon';
import { Client } from './lib/http';
import { CLIEventEmitter } from './lib/events';
import { Environment } from './lib/environment';
import { HookEngine } from './lib/hooks';
import { PROJECT_FILE, PROJECT_FILE_LEGACY, Project } from './lib/project';
import { Logger } from './lib/utils/logger';
import { InteractiveTaskChain, TaskChain } from './lib/utils/task';
import { readPackageJsonFileOfResolvedModule } from './lib/utils/npm';
import { Telemetry } from './lib/telemetry';
import { CloudSession, ProSession } from './lib/session';
import { Shell } from './lib/shell';
import { createPromptModule } from './lib/prompts';

export * from './definitions';

export { BACKEND_LEGACY, BACKEND_PRO, KNOWN_BACKENDS } from './lib/backends';

const name = '@ionic/cli-utils';

function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'info', async () => {
    const packageJson = await readPackageJsonFileOfResolvedModule(__filename);
    const version = packageJson.version || '';

    return [
      { type: 'cli-packages', key: name, value: version, path: path.dirname(__filename) },
    ];
  });

  hooks.register(name, 'backend:changed', async ({ env }) => {
    const wasLoggedIn = await env.session.isLoggedIn();
    await env.session.logout();

    env.session = await getSession(env.config, env.project, env.client);

    if (wasLoggedIn) {
      env.log.info('You have been logged out.');
    }
  });

  hooks.register(name, 'info', async ({ env, project }) => {
    const osName = await import('os-name');
    const os = osName();
    const node = process.version;

    const npm = await env.shell.cmdinfo('npm', ['-v']);
    const config = await env.config.load();

    const info: InfoHookItem[] = [
      { type: 'cli-packages', key: 'ionic', flair: 'Ionic CLI', value: env.plugins.ionic.meta.pkg.version, path: path.dirname(path.dirname(env.plugins.ionic.meta.filePath)) },
      { type: 'system', key: 'Node', value: node },
      { type: 'system', key: 'npm', value: npm || 'not installed' },
      { type: 'system', key: 'OS', value: os },
      { type: 'misc', key: 'backend', value: config.backend },
    ];

    const projectFile = project.directory ? await project.load() : undefined;

    if (projectFile) {
      if (projectFile.type === 'ionic1') {
        const { getIonic1Version } = await import('./lib/ionic1/utils');
        const ionic1Version = await getIonic1Version(env);
        info.push({ type: 'local-packages', key: 'Ionic Framework', value: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' });
      } else if (projectFile.type === 'ionic-angular') {
        const { getIonicAngularVersion, getAppScriptsVersion } = await import('./lib/ionic-angular/utils');
        const [ ionicAngularVersion, appScriptsVersion ] = await Promise.all([getIonicAngularVersion(env, project), getAppScriptsVersion(env, project)]);
        info.push({ type: 'local-packages', key: 'Ionic Framework', value: ionicAngularVersion ? `ionic-angular ${ionicAngularVersion}` : 'not installed' });
        info.push({ type: 'local-packages', key: '@ionic/app-scripts', value: appScriptsVersion ? appScriptsVersion : 'not installed' });
      }

      if (projectFile.integrations.cordova && projectFile.integrations.cordova.enabled !== false) {
        const { getAndroidSdkToolsVersion } = await import('./lib/android');
        const { getCordovaCLIVersion, getCordovaPlatformVersions } = await import('./lib/cordova/utils');

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
        const { getGulpVersion } = await import('./lib/gulp');
        const gulpVersion = await getGulpVersion(env);
        info.push({ type: 'global-packages', key: 'Gulp CLI', value: gulpVersion || 'not installed globally' });
      }
    }

    return info;
  });

  hooks.register(name, 'cordova:project:info', async ({ env }) => {
    const { ConfigXml } = await import('./lib/cordova/config');
    const conf = await ConfigXml.load(env.project.directory);
    return conf.getProjectInfo();
  });
}

async function getSession(config: IConfig, project: IProject, client: IClient): Promise<ISession> {
  const configData = await config.load();
  return configData.backend === BACKEND_LEGACY ? new CloudSession(config, project, client) : new ProSession(config, project, client);
}

export async function generateIonicEnvironment(plugin: RootPlugin, pargv: string[], env: { [key: string]: string }): Promise<IonicEnvironment> {
  const cwd = process.cwd();
  const argv = parseArgs(pargv, { boolean: true, string: '_' });
  const config = new Config(env['IONIC_CONFIG_DIRECTORY'] || DEFAULT_CONFIG_DIRECTORY, CONFIG_FILE);
  const flags = gatherFlags(argv);

  let stream: NodeJS.WritableStream;
  let tasks: TaskChain;
  let bottomBar: inquirerType.ui.BottomBar | undefined;
  let log: Logger;
  let level: LogLevel = 'info';
  let levelInvalid = false;
  let prefix: LogPrefix = '';

  const configData = await config.load();

  if (isCI || configData.interactive === false) {
    flags.interactive = false;
  }

  if (argv['log-level']) {
    if (isLogLevel(argv['log-level'])) {
      level = argv['log-level'];
    } else {
      levelInvalid = true;
    }
  }

  if (argv['log-timestamps']) {
    prefix = () => `${chalk.dim('[' + new Date().toISOString() + ']')}`;
  }

  if (flags.interactive) {
    const inquirer = await import('inquirer');
    bottomBar = new inquirer.ui.BottomBar();
    stream = bottomBar.log;
    log = new Logger({ level, prefix, stream });
    tasks = new InteractiveTaskChain({ log, bottomBar });
  } else {
    stream = process.stdout;
    log = new Logger({ level, prefix, stream });
    tasks = new TaskChain({ log });
  }

  const projectDir = await findBaseDirectory(cwd, PROJECT_FILE);

  env['IONIC_PROJECT_DIR'] = projectDir || '';
  env['IONIC_PROJECT_FILE'] = PROJECT_FILE;

  configData.version = plugin.meta.pkg.version;

  const project = new Project(env['IONIC_PROJECT_DIR'], PROJECT_FILE);
  const client = new Client(config);
  const session = await getSession(config, project, client);
  const hooks = new HookEngine();
  const daemon = new Daemon(env['IONIC_DAEMON_DIRECTORY'] || DEFAULT_CONFIG_DIRECTORY, DAEMON_JSON_FILE);
  const telemetry = new Telemetry();
  const shell = new Shell({ tasks, log, project });

  registerHooks(hooks);

  await Promise.all([config.prepare(), daemon.prepare()]);

  const ienv = new Environment({
    bottomBar,
    client,
    config,
    daemon,
    events: new CLIEventEmitter(),
    flags,
    hooks,
    log,
    meta: {
      cwd,
      local: env['IONIC_CLI_LOCAL'] ? true : false,
      binPath: env['IONIC_CLI_BIN'],
      libPath: env['IONIC_CLI_LIB'],
    },
    namespace: plugin.namespace,
    plugins: {
      ionic: plugin,
    },
    prompt: await createPromptModule({ confirm: flags.confirm, interactive: flags.interactive, log, config }),
    project,
    session,
    shell,
    tasks,
    telemetry,
  });

  telemetry.env = ienv; // TODO: proper DI

  await ienv.open();

  if (env['IONIC_CLI_LOCAL_ERROR']) {
    log.debug(() => `Reason for not using local CLI: ${chalk.bold(env['IONIC_CLI_LOCAL_ERROR'])}`);

    if (env['IONIC_CLI_LOCAL_ERROR'] === ERROR_VERSION_TOO_OLD) {
      log.warn(`Detected locally installed Ionic CLI, but it's too old--using global CLI.`);
    }
  }

  if (levelInvalid) {
    log.warn(
      `${chalk.green(argv['log-level'])} is an invalid log level--defaulting back to ${chalk.bold(level)}.\n` +
      `You can choose from the following log levels: ${LOG_LEVELS.map(l => chalk.green(l)).join(', ')}.\n`
    );
  }

  log.debug(() => `CLI flags: ${util.inspect(flags, { breakLength: Infinity, colors: chalk.enabled })}`);

  if (typeof argv['yarn'] === 'boolean') {
    log.warn(`${chalk.green('--yarn')} / ${chalk.green('--no-yarn')} switch is deprecated. Use ${chalk.green('ionic config set -g yarn ' + String(argv['yarn']))}.`);
    configData.yarn = argv['yarn'];
  }

  if (!projectDir) {
    const foundDir = await findBaseDirectory(cwd, PROJECT_FILE_LEGACY);

    if (foundDir) {
      log.warn(`${chalk.bold(PROJECT_FILE_LEGACY)} file found in ${chalk.bold(foundDir)}--please rename it to ${chalk.bold(PROJECT_FILE)}, or your project directory will not be detected!`);
    }
  }

  return ienv;
}
