import { processExit } from '@ionic/utils-process';
import { ERROR_COMMAND_NOT_FOUND, ERROR_NON_ZERO_EXIT, SubprocessError, which } from '@ionic/utils-subprocess';

import { CommandLineOptions, IConfig, ILogger, IShell, IShellRunOptions, NpmClient } from '../definitions';

import { input, weak } from './color';
import { FatalException } from './errors';
import { createPrefixedWriteStream } from './utils/logger';
import { pkgManagerArgs } from './utils/npm';

export const SUPPORTED_PLATFORMS: readonly string[] = ['android', 'ios'];

export interface NativeRunSchema {
  packagePath: string;
  platform: string;
  portForward?: string | number;
  consolelogsPortForward?: string | number;
}

export function createNativeRunArgs({ packagePath, platform, portForward, consolelogsPortForward }: NativeRunSchema, options: CommandLineOptions): string[] {
  const opts = [platform, '--app', packagePath];
  const target = options['target'] ? String(options['target']) : undefined;

  if (target) {
    opts.push('--target', target);
  } else if (options['emulator']) {
    opts.push('--virtual');
  }

  if (options['connect']) {
    opts.push('--connect');
  }

  if (!options['livereload-url'] && portForward) {
    opts.push('--forward', `${portForward}:${portForward}`);
  }
  if (options['consolelogs'] && consolelogsPortForward) {
    opts.push('--forward', `${consolelogsPortForward}:${consolelogsPortForward}`)
  }

  if (options['json']) {
    opts.push('--json');
  }

  if (options['verbose']) {
    opts.push('--verbose');
  }

  return opts;
}

export function createNativeRunListArgs(inputs: string[], options: CommandLineOptions): string[] {
  const args = [];
  if (inputs[0]) {
    args.push(inputs[0]);
  }
  args.push('--list');
  if (options['json']) {
    args.push('--json');
  }
  if (options['device']) {
    args.push('--device');
  }
  if (options['emulator']) {
    args.push('--virtual');
  }
  if (options['json']) {
    args.push('--json');
  }

  return args;
}

export interface RunNativeRunDeps {
  readonly config: IConfig;
  readonly log: ILogger;
  readonly shell: IShell;
}

export async function runNativeRun({ config, log, shell }: RunNativeRunDeps, args: readonly string[], options: IShellRunOptions = {}): Promise<void> {
  const connect = args.includes('--connect');
  const stream = connect ? createPrefixedWriteStream(log, weak(`[native-run]`)) : undefined;

  try {
    await shell.run('native-run', args, { showCommand: !args.includes('--json'), fatalOnNotFound: false, stream, ...options });
  } catch (e) {
    if (e instanceof SubprocessError && e.code === ERROR_COMMAND_NOT_FOUND) {
      throw createNativeRunNotFoundError(config.get('npmClient'));
    }

    throw e;
  }

  // If we connect the `native-run` process to the running app, then we
  // should also connect the Ionic CLI with the running `native-run` process.
  // This will exit the Ionic CLI when `native-run` exits.
  if (connect) {
    processExit(0); // tslint:disable-line:no-floating-promises
  }
}

export interface CheckNativeRunDeps {
  readonly config: IConfig;
}

export async function checkNativeRun({ config }: CheckNativeRunDeps): Promise<void> {
  try {
    await which('native-run');
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw await createNativeRunNotFoundError(config.get('npmClient'));
    }

    throw e;
  }
}

async function createNativeRunNotFoundError(npmClient: NpmClient): Promise<FatalException> {
  const installArgs = await pkgManagerArgs(npmClient, { command: 'install', pkg: 'native-run', global: true });

  return new FatalException(
    `${input('native-run')} was not found on your PATH. Please install it globally:\n` +
    `${input(installArgs.join(' '))}\n`
  );
}

export interface NativeDeviceTarget {
  platform: string;
  id: string;
  model: string;
  sdkVersion: string;
}

export interface NativeVirtualDeviceTarget {
  platform: string;
  id: string;
  name: string;
  sdkVersion: string;
}

export interface NativeTargetPlatform {
  devices: NativeDeviceTarget[];
  virtualDevices: NativeVirtualDeviceTarget[];
}

export async function getNativeTargets({ log, shell }: RunNativeRunDeps, platform: string): Promise<NativeTargetPlatform> {
  try {
    const proc = await shell.createSubprocess('native-run', [platform, '--list', '--json']);
    const output = await proc.output();

    return JSON.parse(output);
  } catch (e) {
    if (e instanceof SubprocessError && e.code === ERROR_NON_ZERO_EXIT) {
      const output = e.output ? JSON.parse(e.output) : {};

      throw new FatalException(
        `Error while getting native targets for ${input(platform)}: ${output.error || output.code}\n` +
        (
          platform === 'android' && output.code === 'ERR_UNSUITABLE_API_INSTALLATION' ?
          (
            `\n${input('native-run')} needs a fully installed SDK Platform to run your app.\n` +
            `- Run ${input('native-run android --sdk-info')} to see missing packages for each API level.\n` +
            `- Install missing packages in Android Studio by opening the SDK manager.\n`
          ) : ''
        ) +
        `\nThis error occurred while using ${input('native-run')}. You can try running this command with ${input('--no-native-run')}, which will revert to using Cordova.\n`
      );
    }

    log.warn(`Error while getting native targets for ${input(platform)}:\n${e.stack ? e.stack : e}`);
  }

  return { devices: [], virtualDevices: [] };
}
