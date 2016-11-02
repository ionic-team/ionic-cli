import * as os from 'os';
import * as path from 'path';

import * as inquirer from 'inquirer';
import * as minimist from 'minimist';

import { ConfigFile, LogLevel, SuperAgentError } from './definitions';

import { IonicNamespace } from './commands';
import { App } from './lib/app';
import { BaseConfig, Config } from './lib/config';
import { FatalException } from './lib/errors';
import { formatError as formatSuperAgentError, Client } from './lib/http';
import { Project } from './lib/project';
import { Session } from './lib/session';
import { Shell } from './lib/shell';
import { TASKS } from './lib/utils/task';
import { Logger } from './lib/utils/logger';

export * from './definitions';

export { Command, CommandMetadata } from './lib/command';
export { CommandMap, Namespace, NamespaceMap } from './lib/command/namespace';
export { BaseConfig, Config } from './lib/config';
export { FatalException } from './lib/errors';
export { isAPIResponseSuccess, isAPIResponseError } from './lib/http';
export { indent, prettyPath, ICON_SUCCESS_GREEN, ICON_FAILURE_RED } from './lib/utils/format';
export { fileToString } from './lib/utils/fs';
export { promisify } from './lib/utils/promisify';
export { Task, TaskChain } from './lib/utils/task';
export { runcmd } from './lib/utils/shell';
export { validators } from './lib/validators';

const CONFIG_FILE = 'config.json';
const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');
const PROJECT_FILE = 'ionic.config.json';

function cleanup() {
  for (let task of TASKS) {
    if (task.running) {
      task.fail();
    }

    task.clear();
  }
}

function isSuperAgentError(e: Error): e is SuperAgentError {
  let err: SuperAgentError = <SuperAgentError>e;
  return e && err.response && typeof err.response === 'object';
}

export async function run(pargv: string[], env: { [k: string]: string }) {
  let exitCode = 0;
  let err: Error | undefined;

  // Check version?
  pargv = pargv.slice(2);
  const argv = minimist(pargv);

  const log = new Logger();
  const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
  log.level = argv['loglevel'] || 'info'; // TODO validate log level

  try {
    const c = await config.load();

    const client = new Client(c.urls.api);
    const project = new Project('.', PROJECT_FILE);
    const session = new Session(config, project, client);
    const app = new App(session, project, client);
    const shell = new Shell();

    const ns = new IonicNamespace({
      app,
      client,
      config,
      inquirer,
      log,
      pargv,
      project,
      session,
      shell
    });

    await ns.run(pargv, { showCommand: false });
  } catch (e) {
    err = e;
  }

  cleanup();

  if (err) {
    exitCode = 1;

    if (isSuperAgentError(err)) {
      console.error(formatSuperAgentError(err));
    } else if (err instanceof FatalException) {
      exitCode = err.exitCode;

      if (err.message) {
        log.error(err.message);
      }
    } else {
      console.error(err);
    }
  }

  await config.save();

  process.exit(exitCode);
}
