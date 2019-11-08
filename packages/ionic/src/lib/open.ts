import * as Debug from 'debug';
import { Options as OpenOptions } from 'open';

const debug = Debug('ionic:lib:open');

export interface OpenUrlOptions {
  app?: string | readonly string[];
  encode?: boolean;
}

export async function openUrl(target: string, options: OpenUrlOptions = {}): Promise<void> {
  // OpenUrlOptions.encode corresponds to open's 'url' option
  const openOptions: OpenOptions = typeof options.encode === 'undefined' ? { ...options } : { ...options, url: options.encode };

  const o = await import ('open');
  const p = await o(target, { wait: false, url: true, ...openOptions });
  const e = (err: Error) => debug('Error during open: %O', err);
  const n = p.on.bind(p);

  n('error', err => e(err));
}
