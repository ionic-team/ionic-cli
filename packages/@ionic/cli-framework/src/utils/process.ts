export const ERROR_TIMEOUT_REACHED = 'TIMEOUT_REACHED';

export async function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function sleepUntil(predicate: () => boolean, { interval = 30, timeout = 500 }: { interval?: number; timeout?: number; }): Promise<void> {
  let ms = 0;

  while (!predicate()) {
    await sleep(interval);
    ms += interval;

    if (ms > timeout) {
      throw ERROR_TIMEOUT_REACHED;
    }
  }
}
