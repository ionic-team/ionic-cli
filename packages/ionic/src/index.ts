import * as path from 'path';
import * as os from 'os';

import * as minimist from 'minimist';
import * as chalk from 'chalk';

import {
  App,
  CLIEventEmitter,
  Client,
  Config,
  FatalException,
  ICLIEventEmitter,
  IonicEnvironment,
  Logger,
  Project,
  Session,
  Shell,
  TASKS,
  Telemetry,
  formatSuperAgentError,
  fsReadDir,
  getCommandInfo,
  isSuperAgentError,
  load,
  loadPlugins,
  registerEvents as cliUtilsRegisterEvents,
} from '@ionic/cli-utils';

import { IonicNamespace } from './commands';

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

export const version = '__VERSION__';
export const namespace = new IonicNamespace();

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('info', async () => {
    const osName = load('os-name');
    const os = osName();
    const node = process.version;

    const [
      xcode,
      iosDeploy,
      iosSim,
    ] = await Promise.all([
      getCommandInfo('/usr/bin/xcodebuild', ['-version']),
      getCommandInfo('ios-deploy', ['--version']),
      getCommandInfo('ios-sim', ['--version']),
    ]);

    return [
      { type: 'global-npm', name: 'ionic', version: version },
      { type: 'system', name: 'Node', version: node },
      { type: 'system', name: 'OS', version: os },
      { type: 'system', name: 'Xcode', version: xcode },
      { type: 'system', name: 'ios-deploy', version: iosDeploy },
      { type: 'system', name: 'ios-sim', version: iosSim },
    ];
  });
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

    const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
    const project = new Project(env['PROJECT_DIR'], env['PROJECT_FILE']);

    const configData = await config.load();

    const emitter = new CLIEventEmitter();
    const client = new Client(configData.urls.api);
    const telemetry = new Telemetry(config, version);
    const shell = new Shell();
    const session = new Session(config, project, client);
    const app = new App(session, project, client);

    const argv = minimist(pargv);
    argv._ = argv._.map(i => String(i)); // TODO: minimist types are lying

    registerEvents(emitter);
    cliUtilsRegisterEvents(emitter);

    const ionicEnvironment: IonicEnvironment = {
      versions: { cli: version },
      argv,
      pargv,
      app,
      emitter,
      client,
      config,
      log,
      project,
      session,
      shell,
      telemetry,
      namespace,
    };

    await loadPlugins(ionicEnvironment);
    await namespace.runCommand(ionicEnvironment);
    await ionicEnvironment.config.save();

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
      return ['help', ...minimistArgv._];
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
    modifiedArgArray[modifiedArgArray.indexOf('--verbose')] = '--log-level=debug';
  }


  return modifiedArgArray;
}

/**
 * Find the command that is the equivalent of a legacy command.
 */
function mapLegacyCommand(command: string): string | undefined {
  const commandMap: { [command: string]: string} = {
    'build': 'cordova build',
    'compile': 'cordova compile',
    'emulate': 'cordova emulate',
    'platform': 'cordova platform',
    'plugin': 'cordova plugin',
    'prepare': 'cordova prepare',
    'resources': 'cordova resources',
    'run': 'cordova run',
  };

  return commandMap[command];
}
