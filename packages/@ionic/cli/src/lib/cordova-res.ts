import { ERROR_COMMAND_NOT_FOUND, SubprocessError, which } from '@ionic/utils-subprocess';

import { CommandLineOptions, IConfig, ILogger, IShell, IShellRunOptions, NpmClient } from '../definitions';

import { input, weak } from './color';
import { FatalException } from './errors';
import { createPrefixedWriteStream } from './utils/logger';
import { pkgManagerArgs } from './utils/npm';

export const SUPPORTED_PLATFORMS: readonly string[] = ['ios', 'android'];

export interface CordovaResSchema {
  platform?: string;
}

export function createCordovaResArgs({ platform }: CordovaResSchema, options: CommandLineOptions): string[] {
  const args: string[] = [];

  if (platform) {
    args.push(platform);
  }

  if (options['icon']) {
    args.push('--type', 'icon');
  } else if (options['splash']) {
    args.push('--type', 'splash');
  }

  if (options['verbose']) {
    args.push('--verbose');
  }

  return args;
}

export interface RunCordovaResDeps {
  readonly config: IConfig;
  readonly log: ILogger;
  readonly shell: IShell;
}

export async function runCordovaRes({ config, log, shell }: RunCordovaResDeps, args: readonly string[], options: IShellRunOptions = {}): Promise<void> {
  const stream = createPrefixedWriteStream(log, weak(`[cordova-res]`));

  try {
    await shell.run('cordova-res', args, { showCommand: true, fatalOnNotFound: false, stream, ...options });
  } catch (e) {
    if (e instanceof SubprocessError && e.code === ERROR_COMMAND_NOT_FOUND) {
      throw await createCordovaResNotFoundError(config.get('npmClient'));
    }

    throw e;
  }
}

export interface CheckCordovaResDeps {
  readonly config: IConfig;
}

export async function checkCordovaRes({ config }: CheckCordovaResDeps): Promise<void> {
  const p = await findCordovaRes();

  if (!p) {
    throw await createCordovaResNotFoundError(config.get('npmClient'));
  }
}

export async function findCordovaRes(): Promise<string | undefined> {
  try {
    return await which('cordova-res');
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
}

export async function createCordovaResNotFoundError(npmClient: NpmClient): Promise<FatalException> {
  return new FatalException(await createCordovaResNotFoundMessage(npmClient));
}

export async function createCordovaResNotFoundMessage(npmClient: NpmClient): Promise<string> {
  const installArgs = await pkgManagerArgs(npmClient, { command: 'install', pkg: 'cordova-res', global: true });

  return (
    `${input('cordova-res')} was not found on your PATH. Please install it globally:\n\n` +
    `${input(installArgs.join(' '))}\n`
  );
}
