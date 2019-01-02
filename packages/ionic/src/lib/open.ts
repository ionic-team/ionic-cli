import * as Debug from 'debug';

const debug = Debug('ionic:lib:open');

export interface OpenOptions {
  app?: string | ReadonlyArray<string>;
}

export async function open(target: string, options: OpenOptions = {}): Promise<void> {
  const opn = await import ('opn');

  const p = await opn(target, { ...options, wait: false });

  p.on('error', err => {
    debug('Error during open: %O', err);
  });
}
