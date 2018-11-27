import { LOGGER_LEVELS, createPromptModule } from '@ionic/cli-framework';
import { prettyPath } from '@ionic/cli-framework/utils/format';
import { TERMINAL_INFO } from '@ionic/cli-framework/utils/terminal';
import chalk from 'chalk';
import * as Debug from 'debug';
import * as path from 'path';

import { ERROR_VERSION_TOO_OLD } from '../bootstrap';
import { IProject, InfoItem, IonicContext, IonicEnvironment, IonicEnvironmentFlags } from '../definitions';

import { CONFIG_FILE, Config, DEFAULT_CONFIG_DIRECTORY, parseGlobalOptions } from './config';
import { Environment } from './environment';
import { Client } from './http';
import { createProjectFromDirectory, findProjectDirectory } from './project';
import { createOnFallback } from './prompts';
import { ProSession } from './session';
import { Shell, prependNodeModulesBinToPath } from './shell';
import { PROXY_ENVIRONMENT_VARIABLES } from './utils/http';
import { Logger, createDefaultLoggerHandlers } from './utils/logger';

const debug = Debug('ionic:lib');

export async function generateIonicEnvironment(ctx: IonicContext, pargv: string[]): Promise<{ env: IonicEnvironment; project?: IProject; }> {
  process.chdir(ctx.execPath);

  const argv = parseGlobalOptions(pargv);
  const config = new Config(path.resolve(process.env['IONIC_CONFIG_DIRECTORY'] || DEFAULT_CONFIG_DIRECTORY, CONFIG_FILE));

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

  const projectDir = await findProjectDirectory(ctx.execPath);
  const proxyVars = PROXY_ENVIRONMENT_VARIABLES.map((e): [string, string | undefined] => [e, process.env[e]]).filter(([, v]) => !!v);

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
  const env = new Environment({ getInfo, ...deps });

  if (process.env['IONIC_CLI_LOCAL_ERROR']) {
    if (process.env['IONIC_CLI_LOCAL_ERROR'] === ERROR_VERSION_TOO_OLD) {
      log.warn(`Detected locally installed Ionic CLI, but it's too old--using global CLI.`);
    }
  }

  if (typeof argv['yarn'] === 'boolean') {
    log.warn(`${chalk.green('--yarn')} / ${chalk.green('--no-yarn')} has been removed. Use ${chalk.green(`ionic config set -g npmClient ${argv['yarn'] ? 'yarn' : 'npm'}`)}.`);
  }

  const project = projectDir ? await createProjectFromDirectory(projectDir, argv, deps, { logErrors: !['start', 'init'].includes(argv._[0]) }) : undefined;

  if (project) {
    shell.alterPath = p => prependNodeModulesBinToPath(project.directory, p);

    if (project.config.get('pro_id' as any) && argv._[1] !== 'unset') {
      log.warn(
        `The ${chalk.green('pro_id')} field in ${chalk.bold(prettyPath(project.filePath))} has been deprecated.\n` +
        `Ionic Pro has been renamed to Ionic Appflow! We've copied the value in ${chalk.green('pro_id')} to ${chalk.green('id')}, but you may want to unset the deprecated property: ${chalk.green('ionic config unset pro_id')}\n`
      );
    }
  }

  return { env, project };
}
