import * as Debug from 'debug';

const debug = Debug('ionic:lib:open');

export interface OpenUrlOptions {
  app?: string | readonly string[];
}

export async function openUrl(target: string, options: OpenUrlOptions = {}): Promise<void> {
  const o = await import ('open');
  const p = await o(target, { ...options, wait: false, url: true });
  const e = (err: Error) => debug('Error during open: %O', err);
  const n = p.on.bind(p);

  n('error', err => e(err));
}
