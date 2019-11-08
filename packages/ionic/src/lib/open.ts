import * as Debug from 'debug';

const debug = Debug('ionic:lib:open');

export interface OpenUrlOptions {
  app?: string | readonly string[];
  encode?: boolean;
}

export async function openUrl(target: string, options: OpenUrlOptions = {}): Promise<void> {
  const o = await import ('open');
  // an option named 'url' doesn't make much sense for an function named 'openUrl', but encode
  // corresponds to `open`'s 'url' option
  const opts = { ...options, url: options.encode };
  delete opts['encode'];
  const p = await o(target, { wait: false, url: true, ...opts });
  const e = (err: Error) => debug('Error during open: %O', err);
  const n = p.on.bind(p);

  n('error', err => e(err));
}
