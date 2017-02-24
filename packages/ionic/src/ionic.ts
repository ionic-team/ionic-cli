import * as os from 'os';
import * as path from 'path';
import * as minimist from 'minimist';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import {
  IonicEnvironment,
  FatalException,
  formatError as formatSuperAgentError,
  isSuperAgentError,
  TASKS,
  Shell,
  Logger,
  Config,
  Client,
  getCliInfo,
  Telemetry,
  Project,
  Session,
  App,
  fsReadDir
} from '@ionic/cli-utils';

import { resolvePlugin } from './lib/plugins';

const PROJECT_FILE = 'ionic.config.json';
const CONFIG_FILE = 'config.json';
const CONFIG_DIRECTORY = path.resolve(os.homedir(), '.ionic');

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
    const [plugin, inputs] = await resolvePlugin(env['PROJECT_DIR'], env['PROJECT_FILE'], pargv);

    const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
    const configData = await config.load();

    const client = new Client(configData.urls.api);
    const cliInfo = await getCliInfo();
    const telemetry = new Telemetry(config, cliInfo);
    const shell = new Shell();
    const project = new Project(env['PROJECT_DIR'], env['PROJECT_FILE']);
    const session = new Session(config, project, client);
    const app = new App(session, project, client);
    const ionicEnvironment: IonicEnvironment = {
      pargv: inputs,
      app,
      client,
      config,
      log,
      project,
      session,
      shell,
      telemetry,
      inquirer,
      pluginName: plugin.PLUGIN_NAME
    };

    plugin.run(ionicEnvironment);

  } catch (e) {
    err = e;
  }

  cleanup();

  if (err) {
    exitCode = 1;

    if (isSuperAgentError(err)) {
      console.error(formatSuperAgentError(err));
    } else if (err instanceof FatalException) {
      exitCode = err.exitCode || 1;

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

  if (minimistArgv['stats-opt-out']) {
    return ['telemetry', 'no'];
  }

  if (minimistArgv['stats-opt-in']) {
    return ['telemetry', 'yes'];
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
