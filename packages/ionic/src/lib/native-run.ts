import { processExit } from '@ionic/utils-process';
import { ERROR_COMMAND_NOT_FOUND, SubprocessError } from '@ionic/utils-subprocess';

import { CommandLineOptions, IConfig, ILogger, IShell, IShellRunOptions } from '../definitions';

import { input, weak } from './color';
import { FatalException } from './errors';
import { createPrefixedWriteStream } from './utils/logger';
import { pkgManagerArgs } from './utils/npm';

export const SUPPORTED_PLATFORMS: readonly string[] = ['android', 'ios'];

export interface NativeRunSchema {
  packagePath: string;
  platform: string;
  portForward?: string | number;
}

export function createNativeRunArgs({ packagePath, platform, portForward }: NativeRunSchema, options: CommandLineOptions): string[] {
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
  config: IConfig;
  log: ILogger;
  shell: IShell;
}

export async function runNativeRun({ config, log, shell }: RunNativeRunDeps, args: readonly string[], options: IShellRunOptions = {}): Promise<void> {
  const connect = args.includes('--connect');
  const stream = connect ? createPrefixedWriteStream(log, weak(`[native-run]`)) : undefined;

  try {
    await shell.run('native-run', args, { showCommand: !args.includes('--json'), fatalOnNotFound: false, stream, ...options });
  } catch (e) {
    if (e instanceof SubprocessError && e.code === ERROR_COMMAND_NOT_FOUND) {
      const installArgs = await pkgManagerArgs(config.get('npmClient'), { command: 'install', pkg: 'native-run', global: true });
      throw new FatalException(
        `${input('native-run')} was not found on your PATH. Please install it globally:\n` +
        `${input(installArgs.join(' '))}\n`
      );
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
