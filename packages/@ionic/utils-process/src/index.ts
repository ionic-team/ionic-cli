import { createCaseInsensitiveObject } from '@ionic/utils-object';
import { TERMINAL_INFO } from '@ionic/utils-terminal';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as pathlib from 'path';
import * as kill from 'tree-kill';

const debug = Debug('ionic:utils-process');

export const ERROR_TIMEOUT_REACHED = new Error('TIMEOUT_REACHED');

export function killProcessTree(pid: number, signal: string | number = 'SIGTERM'): Promise<void> {
  return new Promise((resolve, reject) => {
    kill(pid, signal, err => {
      if (err) {
        debug('error while killing process tree for %d: %O', pid, err);
        return reject(err);
      }

      resolve();
    });
  });
}

/**
 * Creates an alternative implementation of `process.env` object.
 *
 * On a Windows shell, `process.env` is a magic object that offers
 * case-insensitive environment variable access. On other platforms, case
 * sensitivity matters. This method creates an empty "`process.env`" object
 * type that works for all platforms.
 */
export function createProcessEnv(...sources: { [key: string]: string | undefined; }[]): NodeJS.ProcessEnv {
  return lodash.assign(TERMINAL_INFO.windows ? createCaseInsensitiveObject() : {}, ...sources);
}

/**
 * Split a PATH string into path parts.
 */
export function getPathParts(envpath = process.env.PATH || ''): string[] {
  return envpath.split(pathlib.delimiter);
}

/**
 * Resolves when the given amount of milliseconds has passed.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Resolves when a given predicate is true or a timeout is reached.
 *
 * Configure `interval` to set how often the `predicate` is called.
 *
 * By default, `timeout` is Infinity. If given a value (in ms), and that
 * timeout value is reached, this function will reject with
 * the `ERROR_TIMEOUT_REACHED` error.
 */
export async function sleepUntil(predicate: () => boolean, { interval = 30, timeout = Infinity }: { interval?: number; timeout?: number; }): Promise<void> {
  let ms = 0;

  while (!predicate()) {
    await sleep(interval);
    ms += interval;

    if (ms > timeout) {
      throw ERROR_TIMEOUT_REACHED;
    }
  }
}

/**
 * Never resolves and keeps Node running.
 */
export async function sleepForever(): Promise<never> {
  return new Promise<never>(() => {
    setInterval(() => { /* do nothing */ }, 1000);
  });
}

/**
 * Register a synchronous function to be called once the process exits.
 */
export function onExit(fn: () => void) {
  process.on('exit', () => {
    debug('onExit: process.exit/normal shutdown');
    fn();
  });
}

export type ExitFn = () => Promise<void>;

const exitFns = new Set<ExitFn>();

/**
 * Register an asynchronous function to be called when the process wants to
 * exit.
 *
 * A handler will be registered for the 'SIGINT', 'SIGTERM', 'SIGHUP',
 * 'SIGBREAK' signals. If any of the signal events is emitted, `fn` will be
 * called exactly once, awaited upon, and then the process will exit once all
 * registered functions are resolved.
 */
export function onBeforeExit(fn: ExitFn): void {
  exitFns.add(fn);
}

/**
 * Remove a function that was registered with `onBeforeExit`.
 */
export function offBeforeExit(fn: ExitFn): void {
  exitFns.delete(fn);
}

export type Signal = 'process.exit' | NodeJS.Signals;

const BEFORE_EXIT_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'];

const beforeExitHandlerWrapper = (signal: Signal) => lodash.once(async () => {
  debug(`onBeforeExit handler: ${signal} received`);
  debug(`onBeforeExit handler: running ${exitFns.size} functions`);

  await Promise.all([...exitFns.values()].map(async fn => {
    try {
      await fn();
    } catch (e) {
      debug('onBeforeExit handler: error from function: %O', e);
    }
  }));

  debug(`onBeforeExit handler: exiting (exit code ${process.exitCode ? process.exitCode : 0})`);

  process.exit();
});

for (const signal of BEFORE_EXIT_SIGNALS) {
  process.on(signal, beforeExitHandlerWrapper(signal));
}

const processExitHandler = beforeExitHandlerWrapper('process.exit');

/**
 * Asynchronous `process.exit()`, for running functions registered with
 * `onBeforeExit`.
 */
export async function processExit(exitCode = 0) {
  process.exitCode = exitCode;
  await processExitHandler();
}
