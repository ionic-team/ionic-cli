import * as util from 'util';
import * as path from 'path';

import chalk from 'chalk';
import { isCI } from 'ci-info';
import { parseArgs } from '@ionic/cli-framework';
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

import { BaseProject, OutsideProject, PROJECT_FILE, PROJECT_FILE_LEGACY, ProjectDeps } from './lib/project';
import { ERROR_VERSION_TOO_OLD } from './bootstrap';
import { CONFIG_FILE, Config, DEFAULT_CONFIG_DIRECTORY, gatherFlags } from './lib/config';
import { Client } from './lib/http';
import { CLIEventEmitter } from './lib/events';
import { Environment } from './lib/environment';
import { HookEngine } from './lib/hooks';
import { BACKEND_LEGACY } from './lib/backends';
import { Logger } from './lib/utils/logger';
import { InteractiveTaskChain, TaskChain } from './lib/utils/task';
import { readPackageJsonFileOfResolvedModule } from './lib/utils/npm';
import { Telemetry } from './lib/telemetry';
import { CloudSession, ProSession } from './lib/session';
import { Shell } from './lib/shell';
import { createPromptModule } from './lib/prompts';

export * from './definitions';
export * from './constants';
export * from './guards';

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

    env.session = await getSession(env.config, env.client, env.project);

    if (wasLoggedIn) {
      env.log.msg('You have been logged out.');
    }
  });

  hooks.register(name, 'info', async ({ env }) => {
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

    const projectFile = env.project.directory ? await env.project.load() : undefined;

    info.push(...(await env.project.getInfo()));

    if (projectFile) {
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

        info.push(
          { type: 'global-packages', key: 'cordova', flair: 'Cordova CLI', value: cordovaVersion || 'not installed' },
          { type: 'local-packages', key: 'Cordova Platforms', value: cordovaPlatforms || 'none' }
        );

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
    }

    return info;
  });

  hooks.register(name, 'cordova:project:info', async ({ env }) => {
    const { ConfigXml } = await import('./lib/cordova/config');
    const conf = await ConfigXml.load(env.project.directory);
    return conf.getProjectInfo();
  });
}

async function getSession(config: IConfig, client: IClient, project?: IProject): Promise<ISession> {
  const configData = await config.load();
  return configData.backend === BACKEND_LEGACY ? new CloudSession(config, client, project) : new ProSession(config, client, project);
}

export async function getProject(projectDir: string | undefined, deps: ProjectDeps): Promise<IProject> {
  if (!projectDir) {
    return new OutsideProject('', PROJECT_FILE);
  }

  const type = await BaseProject.determineType(projectDir, deps);

  if (!type) {
    return new OutsideProject('', PROJECT_FILE);
  }

  return BaseProject.createFromProjectType(projectDir, PROJECT_FILE, deps, type);
}

export async function generateIonicEnvironment(plugin: RootPlugin, pargv: string[], env: { [key: string]: string }): Promise<IonicEnvironment> {
  const cwd = process.cwd();
  const argv = parseArgs(pargv, { boolean: true, string: '_' });
  const config = new Config(env['IONIC_CONFIG_DIRECTORY'] || DEFAULT_CONFIG_DIRECTORY, CONFIG_FILE);
  const flags = gatherFlags(argv);

  let outstream: NodeJS.WritableStream;
  let errstream: NodeJS.WritableStream;
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
    outstream = bottomBar.log;
    errstream = bottomBar.log;
    log = new Logger({ level, prefix, outstream, errstream });
    tasks = new InteractiveTaskChain({ log, bottomBar });
  } else {
    outstream = process.stdout;
    errstream = process.stderr;
    log = new Logger({ level, prefix, outstream, errstream });
    tasks = new TaskChain({ log });
  }

  const projectDir = await findBaseDirectory(cwd, PROJECT_FILE);

  env['IONIC_PROJECT_DIR'] = projectDir || '';
  env['IONIC_PROJECT_FILE'] = PROJECT_FILE;

  configData.version = plugin.meta.pkg.version;

  const project = await getProject(projectDir, { log });
  const client = new Client(config);
  const session = await getSession(config, client, project);
  const hooks = new HookEngine();
  const telemetry = new Telemetry();
  const shell = new Shell({ tasks, log, project });

  registerHooks(hooks);

  await config.prepare();

  const ienv = new Environment({
    bottomBar,
    client,
    config,
    env,
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

  // TODO: proper DI
  ienv.namespace.env = ienv;
  telemetry.env = ienv;

  ienv.open();

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
