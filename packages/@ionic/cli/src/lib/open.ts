import * as Debug from 'debug';

const debug = Debug('ionic:lib:open');

export interface OpenUrlOptions {
  app?: string | readonly string[];
  encode?: boolean;
}

export async function openUrl(target: string, { app, encode: url = true }: OpenUrlOptions = {}): Promise<void> {
  const o = await import ('open');
  const p = await o(target, { wait: false, app, url });
  const e = (err: Error) => debug('Error during open: %O', err);
  const n = p.on.bind(p);

  n('error', err => e(err));
}
