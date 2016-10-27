export * from './definitions';

export { isAPIResponseSuccess, isAPIResponseError } from './lib/http';

import * as inquirer from 'inquirer';
import * as minimist from 'minimist';

import { SuperAgentError } from './definitions';

import { IonicNamespace } from './commands';
import { Client, formatError as formatSuperAgentError } from './lib/http';
import { Config } from './lib/config';
import { FatalException } from './lib/errors';
import { Project } from './lib/project';
import { Session } from './lib/session';
import { Logger } from './lib/utils/logger';
import { TASKS } from './lib/utils/task';

export { Command, CommandMap, Namespace, NamespaceMap, CommandMetadata } from './lib/command';
export { FatalException } from './lib/errors';
export { indent, prettyPath, ICON_SUCCESS_GREEN, ICON_FAILURE_RED } from './lib/utils/format';
export { promisify } from './lib/utils/promisify';
export { Task, TaskChain } from './lib/utils/task';
export { validators } from './lib/validators';

const defaultCommand = 'help';

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
  pargv = pargv.slice(2)
  const argv = minimist(pargv);

  // Global CLI option setup
  const logLevel: string = argv['loglevel'] || 'warn';
  const log = new Logger({ level: logLevel, prefix: '' });
  const config = new Config(env);

  try {
    const c = await config.load();

    const client = new Client(c.urls.api);
    const project = new Project('.');
    const session = new Session(config, client);

    const ns = new IonicNamespace({
      client,
      config,
      inquirer,
      log,
      pargv,
      project,
      session
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
      log.error(err.message);
    } else {
      console.error(err);
    }
  }

  await config.save();

  process.exit(exitCode);
}
