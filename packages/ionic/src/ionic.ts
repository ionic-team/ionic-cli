import * as minimist from 'minimist';
import * as path from 'path';
import {
  FatalException,
  formatError as formatSuperAgentError,
  isSuperAgentError,
  TASKS,
  Logger,
  fsReadDir
} from '@ionic/cli-utils';

import { resolvePlugin } from './lib/plugins';

const PROJECT_FILE = 'ionic.config.json';

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

  // If verbose flag is passed the log.level becomes debug
  if (argv['verbose']) {
    argv['log-level'] = 'debug';
  }

  if (argv['log-level']) {
    log.level = argv['log-level'];
  }

  env['PROJECT_FILE'] = PROJECT_FILE;
  env['PROJECT_DIR'] = await getProjectRootDir(env['PWD'], env['PROJECT_FILE']);

  try {
    const [plugin, inputs] = resolvePlugin(env['PROJECT_DIR'], pargv);
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

/**
 * Find the base project directory based on the dir input
 */
async function getProjectRootDir(dir: string, projectFileName: string): Promise<string> {
  const dirInfo = path.parse(dir);
  const directoriesToCheck = dirInfo.dir
    .slice(dirInfo.root.length)
    .split(path.sep)
    .concat(dirInfo.base)
    .map((segment: string, index: number, array: string[]) => {
      let pathSegments = array.slice(0, (array.length - index));
      return dirInfo.root + path.join(...pathSegments);
    });

  for (let i = 0; i < directoriesToCheck.length; i++) {
    const results = await fsReadDir(directoriesToCheck[i]);
    if (results.includes(projectFileName)) {
      return directoriesToCheck[i];
    }
  }

  return '';
}
