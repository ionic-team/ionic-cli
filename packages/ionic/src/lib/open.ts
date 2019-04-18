import * as Debug from 'debug';

const debug = Debug('ionic:lib:open');

export interface OpenOptions {
  app?: string | ReadonlyArray<string>;
}

export async function open(target: string, options: OpenOptions = {}): Promise<void> {
  const o = await import ('open');
  const p = await o(target, { ...options, wait: false });
  const e = (err: Error) => debug('Error during open: %O', err);
  const n = p.on.bind(p);

  n('error', err => e(err));
}
