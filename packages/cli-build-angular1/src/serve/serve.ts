import * as open from 'open';
import { createHttpServer } from './http-server';
import { createLiveReloadServer } from './live-reload';
import {
  ServerOptions,
  IONIC_LAB_URL
} from './serve-config';

export async function serve(options: ServerOptions): Promise<{ [key: string]: any }> {

  createLiveReloadServer(options);
  createHttpServer(options);

  await watch(options);

  onReady(options);
  return options;
}

function onReady(options: ServerOptions) {
  if (!options.nobrowser || options.lab) {
    const openOptions: string[] = [`http://${options.address}:${options.port}`]
      .concat(options.lab ? [IONIC_LAB_URL] : [])
      .concat(options.browseroption ? [options.browseroption] : [])
      .concat(options.platform ? ['?ionicplatform=', options.platform] : []);

    open(openOptions.join(''), options.browser);
  }
  console.log(`dev server running: http://${options.address}:${options.port}`);
}
