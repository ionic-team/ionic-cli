
import { LOGGER_LEVELS, createPromptModule, createTaskChainWithOutput, parseArgs } from '@ionic/cli-framework';
import { findBaseDirectory, fsReadJsonFile } from '@ionic/cli-framework/utils/fs';
import { TERMINAL_INFO } from '@ionic/cli-framework/utils/terminal';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';

import { ERROR_VERSION_TOO_OLD } from './bootstrap';
import { PROJECT_FILE } from './constants';
import { IProject, InfoItem, IonicContext, IonicEnvironment, ProjectType } from './definitions';
import { CONFIG_FILE, Config, DEFAULT_CONFIG_DIRECTORY, gatherFlags } from './lib/config';
import { Environment } from './lib/environment';
import { Client } from './lib/http';
import { OutsideProject, Project, ProjectDeps } from './lib/project';
import { createOnFallback } from './lib/prompts';
import { ProSession } from './lib/session';
import { Shell } from './lib/shell';
import { PROXY_ENVIRONMENT_VARIABLES } from './lib/utils/http';
import { Logger } from './lib/utils/logger';

export * from './definitions';
export * from './constants';
export * from './guards';

const debug = Debug('ionic:cli-utils');

export async function getProject(projectDir: string | undefined, projectName: string | undefined, deps: ProjectDeps): Promise<IProject> {
  if (!projectDir) {
    return new OutsideProject('', PROJECT_FILE);
  }

  const projectFilePath = path.resolve(projectDir, PROJECT_FILE);
  let projectFile: { [key: string]: any; } | undefined;
  let type: ProjectType | undefined;

  try {
    projectFile = await fsReadJsonFile(projectFilePath);
  } catch (e) {
    debug('Attempted to load project config %s but got error: %O', projectFilePath, e);
  }

  if (projectFile) {
    type = await Project.determineType(projectDir, projectName, projectFile, deps);
    projectName = projectName || projectFile.defaultProject;

    debug(`Project name: ${chalk.bold(String(projectName))}`);
  }

  if (!type) {
    return new OutsideProject('', PROJECT_FILE);
  }

  return Project.createFromProjectType(projectDir, PROJECT_FILE, projectName, deps, type);
}

export async function generateIonicEnvironment(ctx: IonicContext, pargv: string[], env: { [key: string]: string; }): Promise<IonicEnvironment> {
  process.chdir(ctx.execPath);

  const argv = parseArgs(pargv, { boolean: ['quiet', 'interactive', 'confirm'], string: ['_', 'project'] });

  const projectName = argv['project'] ? String(argv['project']) : undefined;
  const config = new Config(env['IONIC_CONFIG_DIRECTORY'] || DEFAULT_CONFIG_DIRECTORY, CONFIG_FILE);
  const flags = gatherFlags(argv);

  const configData = await config.load();
  debug('Terminal info: %o', TERMINAL_INFO);

  if (configData.interactive === false || !TERMINAL_INFO.tty || TERMINAL_INFO.ci) {
    flags.interactive = false;
  }

  const log = new Logger({
    level: argv['quiet'] ? LOGGER_LEVELS.WARN : LOGGER_LEVELS.INFO,
    handlers: new Set(),
  });

  const prompt = await createPromptModule({
    interactive: flags.interactive,
    onFallback: createOnFallback({ ...flags, log }),
  });
  const tasks = createTaskChainWithOutput(
    flags.interactive
      ? { output: prompt.output }
      : { output: { stream: log.createWriteStream(LOGGER_LEVELS.INFO, false) } }
  );

  const projectDir = await findBaseDirectory(ctx.execPath, PROJECT_FILE);
  const proxyVars = PROXY_ENVIRONMENT_VARIABLES.map(e => [e, env[e]]).filter(([e, v]) => !!v);

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
        path: path.dirname(path.dirname(ctx.libPath)),
      },
      { group: 'system', key: 'NodeJS', value: process.version, path: process.execPath },
      { group: 'system', key: 'npm', value: npm || 'not installed' },
      { group: 'system', key: 'OS', value: os },
    ];

    info.push(...proxyVars.map(([e, v]): InfoItem => ({ group: 'environment', key: e, value: v })));
    info.push(...(await project.getInfo()));

    return info;
  };

  const shell = new Shell({ log, projectDir });
  const project = await getProject(projectDir, projectName, { config, log, shell, tasks });
  const client = new Client(config);
  const session = new ProSession({ config, client, project });

  await config.prepare();

  const ienv = new Environment({
    client,
    config,
    flags,
    getInfo,
    log,
    ctx,
    prompt,
    project,
    session,
    shell,
    tasks,
  });

  ienv.open();

  if (env['IONIC_CLI_LOCAL_ERROR']) {
    if (env['IONIC_CLI_LOCAL_ERROR'] === ERROR_VERSION_TOO_OLD) {
      log.warn(`Detected locally installed Ionic CLI, but it's too old--using global CLI.`);
    }
  }

  debug('CLI flags: %o', flags);

  if (typeof argv['yarn'] === 'boolean') {
    log.warn(`${chalk.green('--yarn')} / ${chalk.green('--no-yarn')} was removed in CLI 4.0. Use ${chalk.green(`ionic config set -g npmClient ${argv['yarn'] ? 'yarn' : 'npm'}`)}.`);
  }

  return ienv;
}
