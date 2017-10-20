import * as util from 'util';
import * as path from 'path';

import { isCI } from 'ci-info';
import chalk from 'chalk';
import * as minimist from 'minimist';

import * as inquirerType from 'inquirer';

import {
  IClient,
  IConfig,
  IHookEngine,
  IProject,
  ISession,
  IonicEnvironment,
  LogLevel,
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
import { findBaseDirectory } from '@ionic/cli-framework/utils/fs';
import { InteractiveTaskChain, TaskChain } from './lib/utils/task';
import { readPackageJsonFileOfResolvedModule } from './lib/utils/npm';
import { Telemetry } from './lib/telemetry';
import { CloudSession, ProSession } from './lib/session';
import { Shell } from './lib/shell';
import { createPromptModule } from './lib/prompts';

export * from './definitions';

export { BACKEND_LEGACY, BACKEND_PRO, KNOWN_BACKENDS } from './lib/backends';

const name = '@ionic/cli-utils';

export function registerHooks(hooks: IHookEngine) {
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
}

async function getSession(config: IConfig, project: IProject, client: IClient): Promise<ISession> {
  const configData = await config.load();
  return configData.backend === BACKEND_LEGACY ? new CloudSession(config, project, client) : new ProSession(config, project, client);
}

export async function generateIonicEnvironment(plugin: RootPlugin, pargv: string[], env: { [key: string]: string }): Promise<IonicEnvironment> {
  const cwd = process.cwd();
  const argv = minimist(pargv, { boolean: true, string: '_' });
  const config = new Config(env['IONIC_CONFIG_DIRECTORY'] || DEFAULT_CONFIG_DIRECTORY, CONFIG_FILE);
  const configData = await config.load();
  const flags = gatherFlags(argv);

  let stream: NodeJS.WritableStream;
  let tasks: TaskChain;
  let bottomBar: inquirerType.ui.BottomBar | undefined;
  let log: Logger;
  let level: LogLevel = 'info';
  let levelInvalid = false;
  let prefix: string | (() => string) = '';

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

  configData.version = plugin.meta.version;

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
