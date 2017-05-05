import * as path from 'path';

import * as minimist from 'minimist';
import * as chalk from 'chalk';

import {
  App,
  CONFIG_DIRECTORY,
  CONFIG_FILE,
  Client,
  Config,
  HookEngine,
  IHookEngine,
  IonicEnvironment,
  Logger,
  PROJECT_FILE,
  Project,
  Session,
  Shell,
  TaskChain,
  Telemetry,
  checkForUpdates,
  formatSuperAgentError,
  fsReadDir,
  getCommandInfo,
  isSuperAgentError,
  load as loadFromUtils,
  loadPlugins,
  registerHooks as cliUtilsRegisterHooks,
} from '@ionic/cli-utils';

import { IonicNamespace } from './commands';

export const name = '__NAME__';
export const version = '__VERSION__';
export const namespace = new IonicNamespace();

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:info', async () => {
    const osName = loadFromUtils('os-name');
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
      { type: 'global-packages', name: 'Ionic CLI', version: version },
      { type: 'system', name: 'Node', version: node },
      { type: 'system', name: 'OS', version: os },
      { type: 'system', name: 'Xcode', version: xcode || 'not installed' },
      { type: 'system', name: 'ios-deploy', version: iosDeploy || 'not installed' },
      { type: 'system', name: 'ios-sim', version: iosSim || 'not installed' },
    ];
  });
}

export async function run(pargv: string[], env: { [k: string]: string }) {
  const now = new Date();
  let exitCode = 0;
  let err: any;

  pargv = modifyArguments(pargv.slice(2));
  const argv = minimist(pargv);

  const inquirer = loadFromUtils('inquirer');
  const bottomBar = new inquirer.ui.BottomBar();
  const bottomBarHack = <any>bottomBar;
  try { bottomBarHack.rl.output.mute(); } catch (e) {} // TODO
  const log = new Logger({ stream: bottomBar.log });
  const tasks = new TaskChain(bottomBar);

  if (argv['log-level']) {
    log.level = argv['log-level'];
  }

  // If an legacy command is being executed inform the user that there is a new command available
  let foundCommand = mapLegacyCommand(argv._[0]);
  if (foundCommand) {
    log.msg(`The ${chalk.green(argv._[0])} command has been renamed. To find out more, run:\n\n` +
      `  ${chalk.green(`ionic ${foundCommand} --help`)}\n\n`);
  } else {
    env['PROJECT_FILE'] = PROJECT_FILE;
    env['PROJECT_DIR'] = await getProjectRootDir(process.cwd(), env['PROJECT_FILE']);

    try {
      const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
      const project = new Project(env['PROJECT_DIR'], env['PROJECT_FILE']);

      const configData = await config.load();

      const hooks = new HookEngine();
      const client = new Client(configData.urls.api);
      const telemetry = new Telemetry(config, version);
      const shell = new Shell(tasks, log);
      const session = new Session(config, project, client);
      const app = new App(session, project, client);

      const argv = minimist(pargv);
      argv._ = argv._.map(i => String(i)); // TODO: minimist types are lying

      registerHooks(hooks);
      cliUtilsRegisterHooks(hooks);

      const ionicEnvironment: IonicEnvironment = {
        app,
        argv,
        client,
        config,
        hooks,
        log,
        namespace,
        pargv,
        plugins: {
          ionic: {
            name,
            version,
            namespace,
            registerHooks,
          },
        },
        prompt: inquirer.createPromptModule(),
        project,
        session,
        shell,
        tasks,
        telemetry,
      };

      let updates: undefined | string[];

      try {
        await loadPlugins(ionicEnvironment);
      } catch (e) {
        log.error(chalk.red.bold('Error occurred while loading plugins. CLI functionality may be limited.\nChecking for CLI updates now...'));
        log.debug(chalk.red(chalk.bold('Plugin error: ') + (e.stack ? e.stack : e)));
        updates = await checkForUpdates(ionicEnvironment);

        if (updates.length === 0) {
          log.error('No updates found after plugin error--please report this issue.');
        }
      }

      if (typeof updates === 'undefined' && now.getTime() - new Date(configData.lastCommand).getTime() >= 3600000) {
        await checkForUpdates(ionicEnvironment);
      }

      await namespace.runCommand(ionicEnvironment);

      configData.lastCommand = now.toISOString();
      await Promise.all([config.save(), project.save()]);

    } catch (e) {
      log.debug(chalk.red.bold('!!! ERROR ENCOUNTERED !!!'));
      err = e;
    }

    if (err) {
      tasks.fail();
      exitCode = 1;

      if (isSuperAgentError(err)) {
        log.msg(formatSuperAgentError(err));
      } else if (err.fatal) {
        exitCode = err.exitCode || 1;

        if (err.message) {
          log.error(err.message);
        }
      } else {
        log.msg(chalk.red(String(err)));

        if (err.stack) {
          log.debug(chalk.red(err.stack));
        }
      }
      process.exit(exitCode);
    }
  }

  tasks.cleanup();
  bottomBar.close();
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
    return ['version'];
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
    'cordova:build': 'cordova build',
    'cordova:compile': 'cordova compile',
    'cordova:emulate': 'cordova emulate',
    'cordova:platform': 'cordova platform',
    'cordova:plugin': 'cordova plugin',
    'cordova:prepare': 'cordova prepare',
    'cordova:resources': 'cordova resources',
    'cordova:run': 'cordova run',
  };

  return commandMap[command];
}
