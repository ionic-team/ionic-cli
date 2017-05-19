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
  createPromptModule,
  formatSuperAgentError,
  fsReadDir,
  getCommandInfo,
  handleCliFlags,
  isSuperAgentError,
  isValidationErrorArray,
  load as loadFromUtils,
  loadPlugins,
  pathExists,
  pkgInstall,
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

export async function generateIonicEnvironment(pargv: string[], env: { [key: string]: string }): Promise<IonicEnvironment> {
  const inquirer = loadFromUtils('inquirer');
  const bottomBar = new inquirer.ui.BottomBar();
  const bottomBarHack = <any>bottomBar;
  try { bottomBarHack.rl.output.mute(); } catch (e) {} // TODO
  const log = new Logger({ stream: bottomBar.log });
  const tasks = new TaskChain({ log, bottomBar });

  env['PROJECT_FILE'] = PROJECT_FILE;
  env['PROJECT_DIR'] = await getProjectRootDir(process.cwd(), PROJECT_FILE);

  const config = new Config(env['IONIC_DIRECTORY'] || CONFIG_DIRECTORY, CONFIG_FILE);
  const project = new Project(env['PROJECT_DIR'], PROJECT_FILE);

  const configData = await config.load();

  const hooks = new HookEngine();
  const client = new Client(configData.urls.api);
  const telemetry = new Telemetry(config, version);
  const shell = new Shell(tasks, log);
  const session = new Session(config, project, client);
  const app = new App(session, project, client);

  const argv = minimist(pargv, { boolean: true });
  argv._ = argv._.map(i => String(i)); // TODO: minimist types are lying

  registerHooks(hooks);
  cliUtilsRegisterHooks(hooks);

  const ienv = {
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
    prompt: await createPromptModule(log, config),
    project,
    session,
    shell,
    tasks,
    telemetry,

    close() {
      tasks.cleanup();
      bottomBar.close();
    },

  };

  await handleCliFlags(ienv, argv);

  return ienv;
}

export async function run(pargv: string[], env: { [k: string]: string }) {
  const now = new Date();
  let exitCode = 0;
  let err: any;

  pargv = modifyArguments(pargv.slice(2));
  const ienv = await generateIonicEnvironment(pargv, env);

  try {
    const argv = minimist(pargv, { boolean: true });

    if (argv['log-level']) {
      ienv.log.level = argv['log-level'];
    }

    if (ienv.project.directory) {
      const nodeModulesExists = await pathExists(path.join(ienv.project.directory, 'node_modules'));

      if (!nodeModulesExists) {
        const confirm = await ienv.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Looks like a fresh checkout! No ${chalk.green('./node_modules')} directory found. Would you like to install project dependencies?`,
        });

        if (confirm) {
          ienv.log.info('Installing dependencies may take several minutes!');
          await pkgInstall(ienv, undefined, {});
        }
      }
    }

    // If an legacy command is being executed inform the user that there is a new command available
    const foundCommand = mapLegacyCommand(argv._[0]);
    if (foundCommand) {
      ienv.log.msg(`The ${chalk.green(argv._[0])} command has been renamed. To find out more, run:\n\n` +
                   `  ${chalk.green(`ionic ${foundCommand} --help`)}\n\n`);
    } else {
      const configData = await ienv.config.load();
      let updates: undefined | string[];

      try {
        await loadPlugins(ienv);
      } catch (e) {
        if (e.fatal) {
          throw e;
        }

        ienv.log.error(chalk.red.bold('Error occurred while loading plugins. CLI functionality may be limited.\nChecking for CLI updates now...'));
        ienv.log.debug(chalk.red(chalk.bold('Plugin error: ') + (e.stack ? e.stack : e)));
        updates = await checkForUpdates(ienv);

        if (updates.length === 0) {
          ienv.log.error('No updates found after plugin error--please report this issue.');
        }
      }

      if (typeof updates === 'undefined' && now.getTime() - new Date(configData.lastCommand).getTime() >= 3600000) {
        await checkForUpdates(ienv);
      }

      await namespace.runCommand(ienv);

      configData.lastCommand = now.toISOString();
    }

  } catch (e) {
    ienv.log.debug(chalk.red.bold('!!! ERROR ENCOUNTERED !!!'));
    err = e;
  }

  try {
    await Promise.all([ienv.config.save(), ienv.project.save()]);
  } catch (e) {
    ienv.log.error(e);
  }

  if (err) {
    ienv.tasks.fail();
    exitCode = 1;

    if (isValidationErrorArray(err)) {
      for (let e of err) {
        ienv.log.error(e.message);
      }
      ienv.log.msg(`Use the ${chalk.green('--help')} flag for more details.`);
    } else if (isSuperAgentError(err)) {
      ienv.log.msg(formatSuperAgentError(err));
    } else if (err.fatal) {
      exitCode = err.exitCode || 1;

      if (err.message) {
        ienv.log.error(err.message);
      }
    } else {
      ienv.log.msg(chalk.red(String(err)));

      if (err.stack) {
        ienv.log.debug(chalk.red(err.stack));
      }
    }

    process.exit(exitCode);
  }

  ienv.close();
}

/**
 * Find the base project directory based on the dir input
 */
export async function getProjectRootDir(dir: string, projectFileName: string): Promise<string> {
  dir = path.normalize(dir);
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
export function modifyArguments(pargv: string[]): string[] {
  let modifiedArgArray: string[] = pargv.slice();
  const minimistArgv = minimist(pargv, { boolean: true });

  if (pargv.length === 0) {
    return ['help'];
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

  if (minimistArgv._[0] === 'lab') {
    modifiedArgArray[0] = 'serve';
    modifiedArgArray.push('--lab');
  }

  if (minimistArgv['verbose']) {
    modifiedArgArray[modifiedArgArray.indexOf('--verbose')] = '--log-level=debug';
  }

  if (minimistArgv['quiet']) {
    modifiedArgArray[modifiedArgArray.indexOf('--quiet')] = '--log-level=warn';
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
