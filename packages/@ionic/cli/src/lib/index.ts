import { LOGGER_LEVELS } from '@ionic/cli-framework-output';
import { createPromptModule } from '@ionic/cli-framework-prompts';
import { TERMINAL_INFO, prettyPath } from '@ionic/utils-terminal';
import * as Debug from 'debug';
import * as path from 'path';

import { ERROR_VERSION_TOO_OLD } from '../bootstrap';
import { IProject, InfoItem, IonicContext, IonicEnvironment, IonicEnvironmentFlags } from '../definitions';

import { input, strong, success } from './color';
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
    // use `eval()` to avoid `tsc` convert `import()` to `require()`
    // because `os-name` package only support ESM since v5 release
    // TODO: remove `eval()` once we upgrade to typescript 4.7+ and set `module: "node16"` in `tsconfig.base.json`
    const { default: osName } = await eval("import('os-name')");
    const semver = await import('semver');
    const { getUpdateConfig } = await import('./updates');

    const os = osName();

    const [ npm, nativeRun, cordovaRes ] = await Promise.all([
      shell.cmdinfo('npm', ['-v']),
      shell.cmdinfo('native-run', ['--version']),
      shell.cmdinfo('cordova-res', ['--version']),
    ]);

    const { packages: latestVersions } = await getUpdateConfig({ config });
    const latestNativeRun = latestVersions.find(pkg => pkg.name === 'native-run');
    const latestCordovaRes = latestVersions.find(pkg => pkg.name === 'cordova-res');
    const nativeRunUpdate = latestNativeRun && nativeRun ? semver.gt(latestNativeRun.version, nativeRun) : false;
    const cordovaResUpdate = latestCordovaRes && cordovaRes ? semver.gt(latestCordovaRes.version, cordovaRes) : false;

    const info: InfoItem[] = [
      {
        group: 'ionic',
        name: 'Ionic CLI',
        key: 'version',
        value: ctx.version,
        path: ctx.libPath,
      },
      { group: 'system', name: 'NodeJS', key: 'node_version', value: process.version, path: process.execPath },
      { group: 'system', name: 'npm', key: 'npm_version', value: npm || 'not installed' },
      { group: 'system', name: 'OS', key: 'os', value: os },
      {
        group: 'utility',
        name: 'native-run',
        key: 'native_run_version',
        value: nativeRun || 'not installed globally',
        flair: nativeRunUpdate ? `update available: ${latestNativeRun ? success(latestNativeRun.version) : '???'}` : '',
      },
      {
        group: 'utility',
        name: 'cordova-res',
        key: 'cordova_res_version',
        value: cordovaRes || 'not installed globally',
        flair: cordovaResUpdate ? `update available: ${latestCordovaRes ? success(latestCordovaRes.version) : '???'}` : '',
      },
    ];

    info.push(...proxyVars.map(([e, v]): InfoItem => ({ group: 'environment', name: e, value: v || 'not set' })));

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
    log.warn(`${input('--yarn')} / ${input('--no-yarn')} has been removed. Use ${input(`ionic config set -g npmClient ${argv['yarn'] ? 'yarn' : 'npm'}`)}.`);
  }

  const project = projectDir ? await createProjectFromDirectory(projectDir, argv, deps, { logErrors: !['start', 'init'].includes(argv._[0]) }) : undefined;

  if (project) {
    shell.alterPath = p => prependNodeModulesBinToPath(project.directory, p);

    if (project.config.get('pro_id' as any) && argv._[1] !== 'unset') {
      log.warn(
        `The ${input('pro_id')} field in ${strong(prettyPath(project.filePath))} has been deprecated.\n` +
        `Ionic Pro has been renamed to Ionic Appflow! We've copied the value in ${input('pro_id')} to ${input('id')}, but you may want to unset the deprecated property: ${input('ionic config unset pro_id')}\n`
      );
    }
  }

  return { env, project };
}
