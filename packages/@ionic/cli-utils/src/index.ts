import * as util from 'util';
import * as path from 'path';

import chalk from 'chalk';
import { isCI } from 'ci-info';
import { parseArgs } from '@ionic/cli-framework';
import { findBaseDirectory } from '@ionic/cli-framework/utils/fs';

import * as inquirerType from 'inquirer';

import {
  IProject,
  InfoHookItem,
  IonicEnvironment,
  LogLevel,
  LogPrefix,
  RootPlugin,
} from './definitions';

import { BaseProject, OutsideProject, PROJECT_FILE, PROJECT_FILE_LEGACY, ProjectDeps } from './lib/project';
import { ERROR_VERSION_TOO_OLD } from './bootstrap';
import { CONFIG_FILE, Config, DEFAULT_CONFIG_DIRECTORY, gatherFlags } from './lib/config';
import { Client } from './lib/http';
import { CLIEventEmitter } from './lib/events';
import { Environment } from './lib/environment';
import { HookEngine } from './lib/hooks';
import { Logger } from './lib/utils/logger';
import { InteractiveTaskChain, TaskChain } from './lib/utils/task';
import { readPackageJsonFileOfResolvedModule } from './lib/utils/npm';
import { Telemetry } from './lib/telemetry';
import { ProSession } from './lib/session';
import { Shell } from './lib/shell';
import { createPromptModule } from './lib/prompts';

export * from './definitions';
export * from './constants';
export * from './guards';

const name = '@ionic/cli-utils';

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
  let prefix: LogPrefix = '';

  const configData = await config.load();

  if (isCI || configData.interactive === false) {
    flags.interactive = false;
  }

  if (argv['verbose']) {
    level = 'debug';
  } else if (argv['quiet']) {
    level = 'warn';
  }

  if (argv['color'] === false) {
    chalk.enabled = false;
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

  const meta = {
    cwd,
    local: env['IONIC_CLI_LOCAL'] ? true : false,
    binPath: env['IONIC_CLI_BIN'],
    libPath: env['IONIC_CLI_LIB'],
  };

  const shell = new Shell({ tasks, log, projectDir });
  const project = await getProject(projectDir, { log, shell });
  const client = new Client(config);
  const session = new ProSession(config, client, project);
  const hooks = new HookEngine();
  const telemetry = new Telemetry({ config, client, meta, session, hooks, cli: plugin, project });

  hooks.register(name, 'info', async () => {
    const packageJson = await readPackageJsonFileOfResolvedModule(__filename);
    const version = packageJson.version || '';

    return [
      { type: 'cli-packages', key: name, value: version, path: path.dirname(__filename) },
    ];
  });

  hooks.register(name, 'info', async () => {
    const osName = await import('os-name');
    const os = osName();
    const node = process.version;

    const npm = await shell.cmdinfo('npm', ['-v']);

    const info: InfoHookItem[] = [
      { type: 'cli-packages', key: 'ionic', flair: 'Ionic CLI', value: plugin.meta.pkg.version, path: path.dirname(path.dirname(plugin.meta.filePath)) },
      { type: 'system', key: 'Node', value: node },
      { type: 'system', key: 'npm', value: npm || 'not installed' },
      { type: 'system', key: 'OS', value: os },
    ];

    info.push(...(await project.getInfo()));

    return info;
  });

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
    meta,
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

  ienv.open();

  if (env['IONIC_CLI_LOCAL_ERROR']) {
    log.debug(() => `Reason for not using local CLI: ${chalk.bold(env['IONIC_CLI_LOCAL_ERROR'])}`);

    if (env['IONIC_CLI_LOCAL_ERROR'] === ERROR_VERSION_TOO_OLD) {
      log.warn(`Detected locally installed Ionic CLI, but it's too old--using global CLI.`);
    }
  }

  log.debug(() => `CLI flags: ${util.inspect(flags, { breakLength: Infinity, colors: chalk.enabled })}`);

  if (typeof argv['yarn'] === 'boolean') {
    log.warn(`${chalk.green('--yarn')} / ${chalk.green('--no-yarn')} was removed in CLI 4.0. Use ${chalk.green(`ionic config set -g npmClient ${argv['yarn'] ? 'yarn' : 'npm'}`)}.`);
  }

  if (!projectDir) {
    const foundDir = await findBaseDirectory(cwd, PROJECT_FILE_LEGACY);

    if (foundDir) {
      log.warn(`${chalk.bold(PROJECT_FILE_LEGACY)} file found in ${chalk.bold(foundDir)}--please rename it to ${chalk.bold(PROJECT_FILE)}, or your project directory will not be detected!`);
    }
  }

  return ienv;
}
