import * as minimist from 'minimist';
import {
  FatalException,
  formatError as formatSuperAgentError,
  isSuperAgentError,
  TASKS,
  Logger
} from '@ionic/cli-utils';

import { resolvePlugin } from './lib/plugins';

function cleanup() {
  for (let task of TASKS) {
    if (task.running) {
      task.fail();
    }

    task.clear();
  }
}

export async function run(pargv: string[], env: { [k: string]: string }) {
  let exitCode = 0;
  let err: Error | undefined;

  // Check version?
  pargv = pargv.slice(2);
  const argv = minimist(pargv);

  const log = new Logger();

  if (argv['log-level']) {
    log.level = argv['log-level'];
  }

  try {
    const [plugin, inputs] = resolvePlugin(pargv);
    await plugin.run(inputs, env);

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

  process.exit(exitCode);
}
