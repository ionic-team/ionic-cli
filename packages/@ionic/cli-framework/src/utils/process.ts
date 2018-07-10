import * as Debug from 'debug';
import * as lodash from 'lodash';

import { createCaseInsensitiveObject } from './object';

const debug = Debug('ionic:cli-framework:utils:process');

export const ERROR_TIMEOUT_REACHED = 'TIMEOUT_REACHED';

/**
 * Creates an alternative implementation of `process.env` object.
 *
 * On Windows, `process.env` is a magic object that offers case-insensitive
 * environment variable access. On other platforms, case sensitivity matters.
 * This method creates an empty "`process.env`" object type that works for all
 * platforms.
 */
export function createProcessEnv(...sources: { [key: string]: string | undefined; }[]): { [key: string]: string; } {
  return lodash.assign(process.platform === 'win32' ? createCaseInsensitiveObject() : {}, ...sources);
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
 * Never resolves.
 */
export async function sleepForever(): Promise<never> {
  return new Promise<never>(() => { /* never resolves */ });
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

export type ExitQueueFn = () => Promise<void>;

const exitQueue: ExitQueueFn[] = [];

/**
 * Register an asynchronous function to be called when the process wants to
 * exit.
 *
 * A handler will be registered for the 'SIGINT', 'SIGTERM', 'SIGHUP',
 * 'SIGBREAK' signals. If any of the signal events is emitted, `fn` will be
 * called exactly once, awaited upon, and then the process will exit when the
 * queue of functions is empty.
 */
export function onBeforeExit(fn: ExitQueueFn): void {
  exitQueue.push(fn);
}

/**
 * Remove a function that was registered with `onBeforeExit`.
 */
export function offBeforeExit(fn: ExitQueueFn): void {
  lodash.pull(exitQueue, fn);
}

const BEFORE_EXIT_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'];

const beforeExitHandlerWrapper = (signal: string) => lodash.once(async () => {
  debug(`onBeforeExit handler: ${signal} received`);
  debug(`onBeforeExit handler: running ${exitQueue.length} queued functions`);

  for (const fn of exitQueue) {
    await fn();
  }

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
