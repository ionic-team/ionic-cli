import { isCI } from 'ci-info';
import * as chalk from 'chalk';
import * as minimist from 'minimist';

import * as inquirerType from 'inquirer';
import ui = inquirerType.ui;

import { IHookEngine, IonicEnvironment, Plugin } from './definitions';
import { load } from './lib/modules';

import { App } from './lib/app';
import { CONFIG_DIRECTORY, CONFIG_FILE, Config, handleCliFlags } from './lib/config';
import { Client } from './lib/http';
import { CLIEventEmitter } from './lib/events';
import { FatalException } from './lib/errors';
import { HookEngine } from './lib/hooks';
import { PROJECT_FILE, PROJECT_FILE_LEGACY, Project } from './lib/project';
import { Logger } from './lib/utils/logger';
import { findBaseDirectory } from './lib/utils/fs';
import { InteractiveTaskChain, TaskChain } from './lib/utils/task';
import { Telemetry } from './lib/telemetry';
import { Session } from './lib/session';
import { Shell } from './lib/shell';
import { createPromptModule } from './lib/prompts';

export * from './definitions';
export * from './guards';

export * from './lib/app';
export * from './lib/command';
export * from './lib/command/command';
export * from './lib/command/namespace';
export * from './lib/command/utils';
export * from './lib/config';
export * from './lib/deploy';
export * from './lib/errors';
export * from './lib/events';
export * from './lib/help';
export * from './lib/hooks';
export * from './lib/http';
export * from './lib/login';
export * from './lib/modules';
export * from './lib/package';
export * from './lib/plugins';
export * from './lib/project';
export * from './lib/prompts';
export * from './lib/security';
export * from './lib/session';
export * from './lib/shell';
export * from './lib/telemetry';
export * from './lib/utils/archive';
export * from './lib/utils/array';
export * from './lib/utils/environmentInfo';
export * from './lib/utils/format';
export * from './lib/utils/fs';
export * from './lib/utils/logger';
export * from './lib/utils/network';
export * from './lib/utils/npm';
export * from './lib/utils/promise';
export * from './lib/utils/shell';
export * from './lib/utils/string';
export * from './lib/utils/task';
export * from './lib/validators';

export const name = '__NAME__';
export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:info', async () => {
    return [
      { type: 'global-packages', name, version },
    ];
  });
}

export async function generateIonicEnvironment(plugin: Plugin, pargv: string[], env: { [key: string]: string }): Promise<IonicEnvironment> {
  if (!plugin.namespace) {
    throw new FatalException('No root ionic namespace.');
  }

  const argv = minimist(pargv, { boolean: true, string: '_' });

  const config = new Config(env['IONIC_CONFIG_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
  const changedFlags = await handleCliFlags(config, argv);

  const configData = await config.load();

  let stream: NodeJS.WritableStream;
  let tasks: TaskChain;
  let bottomBar: inquirerType.ui.BottomBar | undefined;
  let log: Logger;

  if (isCI && configData.cliFlags['interactive']) {
    configData.cliFlags['interactive'] = false;
    changedFlags.push(['interactive', false]);
  }

  if (configData.cliFlags['interactive']) {
    const inquirer = load('inquirer');
    bottomBar = new inquirer.ui.BottomBar();

    try { // TODO
      const bottomBarHack = <any>bottomBar;
      bottomBarHack.rl.output.mute();
    } catch (e) {
      console.error('EXCEPTION DURING BOTTOMBAR OUTPUT MUTE', e);
    }

    stream = bottomBar.log;
    log = new Logger({ stream });
    tasks = new InteractiveTaskChain({ log, bottomBar });
  } else {
    stream = process.stdout;
    log = new Logger({ stream });
    tasks = new TaskChain({ log });
  }

  for (let [flag, newValue] of changedFlags) {
    const prettyFlag = chalk.green('--' + (newValue ? '' : 'no-' ) + flag);

    if (flag === 'interactive' && !newValue && isCI) {
      log.info('CI detected--switching to non-interactive mode.');
    }

    log.info(`CLI Flag ${prettyFlag} saved`);

    if (flag === 'telemetry' && newValue) {
      log.msg('Thank you for making the CLI better! ❤️');
    } else if (flag === 'confirm' && newValue) {
      log.warn(`Careful with ${prettyFlag}. Some auto-confirmed actions are destructive.`);
    }
  }

  const projectDir = await findBaseDirectory(process.cwd(), PROJECT_FILE);

  if (!projectDir) {
    const foundDir = await findBaseDirectory(process.cwd(), PROJECT_FILE_LEGACY);

    if (foundDir) {
      log.warn(`${chalk.bold(PROJECT_FILE_LEGACY)} file found in ${chalk.bold(foundDir)}--please rename it to ${chalk.bold(PROJECT_FILE)}, or your project directory will not be detected!`);
    }
  }

  env['IONIC_PROJECT_DIR'] = projectDir || '';
  env['IONIC_PROJECT_FILE'] = PROJECT_FILE;

  const project = new Project(projectDir || '', PROJECT_FILE);
  const hooks = new HookEngine();
  const client = new Client(configData.urls.api);
  const telemetry = new Telemetry(config, plugin.version);
  const shell = new Shell(tasks, log);
  const session = new Session(config, project, client);
  const app = new App(session, project, client);

  registerHooks(hooks);

  return {
    app,
    argv,
    client,
    close() {
      tasks.cleanup();

      // instantiating inquirer.ui.BottomBar hangs, so when close() is called,
      // we close BottomBar streams and replace the log stream with stdout.
      // This means inquirer shouldn't be used after command execution finishes
      // (which could happen during long-running processes like serve).
      if (bottomBar) {
        bottomBar.close();
        log.stream = process.stdout;
      }
    },
    config,
    events: new CLIEventEmitter,
    hooks,
    load,
    log,
    namespace: plugin.namespace,
    pargv,
    plugins: {
      ionic: plugin,
    },
    prompt: await createPromptModule(log, config),
    project,
    session,
    shell,
    tasks,
    telemetry,
  };
}
