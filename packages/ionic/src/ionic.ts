import * as minimist from 'minimist';
import * as path from 'path';
import * as chalk from 'chalk';
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

  pargv = modifyArguments(pargv.slice(2));
  const argv = minimist(pargv);

  const log = new Logger();

  if (argv['log-level']) {
    log.level = argv['log-level'];
  }

  // If an legacy command is being executed inform the user that there is a new command available
  let foundCommand = mapLegacyCommand(argv._[0]);
  if (foundCommand) {
    log.msg(`The ${chalk.bold(argv._[0])} command is no longer available. To find out more about the equivalent please run:\n\n` +
      `  ${chalk.green(`ionic ${foundCommand} --help`)}\n`);
    return;
  }

  env['PROJECT_FILE'] = PROJECT_FILE;
  env['PROJECT_DIR'] = await getProjectRootDir(process.cwd(), env['PROJECT_FILE']);

  try {
    const [plugin, inputs] = await resolvePlugin(env['PROJECT_DIR'], pargv);
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
    process.exit(exitCode);
  }
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

/**
 * Map legacy options to their new equivalent
 */
function modifyArguments(pargv: string[]): string[] {
  let modifiedArgArray: string[] = pargv.slice();
  const minimistArgv = minimist(pargv);

  /**
   * Replace command to be executed
   */
  if (pargv.length === 0) {
    return ['help'];
  }

  if (minimistArgv['help'] || minimistArgv['h']) {
    if (minimistArgv._.length > 0) {
      return ['help', minimistArgv._[0]];
    } else {
      return ['help'];
    }
  }

  if (minimistArgv._.length === 0 && (minimistArgv['version'] || minimistArgv['v'])) {
    return modifiedArgArray = ['version'];
  }

  /**
   * Change command executed
   */
  if (minimistArgv._[0] === 'lab') {
    modifiedArgArray[0] = 'serve';
    modifiedArgArray.push('--lab');
  }

  /**
   * Change command options
   */
  if (minimistArgv['verbose']) {
    modifiedArgArray[modifiedArgArray.indexOf('--verbose')] = '--log-level="debug"';
  }


  return modifiedArgArray;
}

/**
 * Find the command that is the equivalent of a legacy command.
 */
function mapLegacyCommand(command: string): string | undefined {
  const commandMap: { [command: string]: string} = {
    'build': 'cordova:build',
    'compile': 'cordova:compile',
    'emulate': 'cordova:emulate',
    'platform': 'cordova:platform',
    'prepare': 'cordova:prepare',
    'resources': 'cordova:resources',
    'run': 'cordova:run',
  };

  return commandMap[command];
}
