import { LOGGER_LEVELS, createPromptModule } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { TERMINAL_INFO } from '@ionic/cli-framework/utils/terminal';
import { findBaseDirectory, fsReadJsonFile } from '@ionic/utils-fs';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';

import { ERROR_VERSION_TOO_OLD } from './bootstrap';
import { PROJECT_FILE } from './constants';
import { IProject, InfoItem, IonicContext, IonicEnvironment, IonicEnvironmentFlags, ProjectType } from './definitions';
import { CONFIG_FILE, Config, DEFAULT_CONFIG_DIRECTORY, parseGlobalOptions } from './lib/config';
import { Environment } from './lib/environment';
import { Client } from './lib/http';
import { ProjectDeps, createProjectFromType, determineProjectType } from './lib/project';
import { createOnFallback } from './lib/prompts';
import { ProSession } from './lib/session';
import { Shell, prependNodeModulesBinToPath } from './lib/shell';
import { PROXY_ENVIRONMENT_VARIABLES } from './lib/utils/http';
import { Logger, createDefaultLoggerHandlers } from './lib/utils/logger';

export * from './definitions';
export * from './constants';
export * from './guards';

const debug = Debug('ionic:cli-utils');

export async function getProject(projectDir: string | undefined, projectName: string | undefined, deps: ProjectDeps): Promise<IProject | undefined> {
  if (!projectDir) {
    return;
  }

  const { log } = deps;
  const projectFilePath = path.resolve(projectDir, PROJECT_FILE);
  let projectFile: { [key: string]: any; } | undefined;
  let type: ProjectType | undefined;

  try {
    projectFile = await fsReadJsonFile(projectFilePath);
  } catch (e) {
    log.error(
      `Error while loading project config file.\n` +
      `Attempted to load project config ${chalk.bold(prettyPath(projectFilePath))} but got error:\n\n` +
      chalk.red(e.toString())
    );
  }

  if (projectFile) {
    projectName = projectName || projectFile.defaultProject;
    type = await determineProjectType(projectDir, projectName, projectFile, deps);

    debug(`Project name: ${chalk.bold(String(projectName))}`);
  }

  if (!type) {
    return;
  }

  return createProjectFromType(projectFilePath, projectName, deps, type);
}

export async function generateIonicEnvironment(ctx: IonicContext, pargv: string[], env: NodeJS.ProcessEnv): Promise<{ env: IonicEnvironment; project?: IProject; }> {
  process.chdir(ctx.execPath);

  const argv = parseGlobalOptions(pargv);
  const projectName = argv['project'] ? String(argv['project']) : undefined;
  const config = new Config(path.resolve(env['IONIC_CONFIG_DIRECTORY'] || DEFAULT_CONFIG_DIRECTORY, CONFIG_FILE));

  debug('Terminal info: %o', TERMINAL_INFO);

  if (config.get('interactive') === false || !TERMINAL_INFO.tty || TERMINAL_INFO.ci) {
    argv['interactive'] = false;
  }

  const flags = argv as any as IonicEnvironmentFlags; // TODO
  debug('CLI global options: %o', flags);

  const log = new Logger({
    level: argv['quiet'] ? LOGGER_LEVELS.WARN : LOGGER_LEVELS.INFO,
    handlers: createDefaultLoggerHandlers(),
  });

  const prompt = await createPromptModule({
    interactive: argv['interactive'],
    onFallback: createOnFallback({ flags, log }),
  });

  const projectDir = await findBaseDirectory(ctx.execPath, PROJECT_FILE);
  const proxyVars = PROXY_ENVIRONMENT_VARIABLES.map((e): [string, string | undefined] => [e, env[e]]).filter(([, v]) => !!v);

  const getInfo = async () => {
    const osName = await import('os-name');
    const os = osName();

    const npm = await shell.cmdinfo('npm', ['-v']);

    const info: InfoItem[] = [
      {
        group: 'ionic',
        key: 'ionic',
        flair: 'Ionic CLI',
        value: ctx.version,
        path: ctx.libPath,
      },
      { group: 'system', key: 'NodeJS', value: process.version, path: process.execPath },
      { group: 'system', key: 'npm', value: npm || 'not installed' },
      { group: 'system', key: 'OS', value: os },
    ];

    info.push(...proxyVars.map(([e, v]): InfoItem => ({ group: 'environment', key: e, value: v || 'not set' })));

    if (project) {
      info.push(...(await project.getInfo()));
    }

    return info;
  };

  const shell = new Shell({ log }, { alterPath: p => projectDir ? prependNodeModulesBinToPath(projectDir, p) : p });
  const client = new Client(config);
  const session = new ProSession({ config, client });
  const deps = { client, config, ctx, flags, log, prompt, session, shell };
  const ienv = new Environment({ getInfo, ...deps });

  if (env['IONIC_CLI_LOCAL_ERROR']) {
    if (env['IONIC_CLI_LOCAL_ERROR'] === ERROR_VERSION_TOO_OLD) {
      log.warn(`Detected locally installed Ionic CLI, but it's too old--using global CLI.`);
    }
  }

  if (typeof argv['yarn'] === 'boolean') {
    log.warn(`${chalk.green('--yarn')} / ${chalk.green('--no-yarn')} has been removed. Use ${chalk.green(`ionic config set -g npmClient ${argv['yarn'] ? 'yarn' : 'npm'}`)}.`);
  }

  let project: IProject | undefined;

  try {
    project = await getProject(projectDir, projectName, deps);
  } catch (e) {
    log.warn(e.toString());
    log.nl();
  }

  return { env: ienv, project };
}
