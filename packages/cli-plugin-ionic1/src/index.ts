import * as path from 'path';

import { ICLIEventEmitter, fsReadJsonFile } from '@ionic/cli-utils';

import { serve } from './serve/index';

export const version = '__VERSION__';

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('docs', async () => {
    return 'https://ionicframework.com/docs/v1/';
  });

  emitter.on('info', async () => {
    const appDirectory = '.'; // TODO: change this
    const ionicVersionJson = await fsReadJsonFile(path.resolve(appDirectory, 'www', 'lib', 'ionic', 'version.json')); // TODO

    return [
      { type: 'local-npm', name: 'Ionic Framework', version: `ionic1 ${ionicVersionJson['version'] || 'unknown'}` },
      { type: 'local-npm', name: '@ionic/cli-plugin-ionic1', version: version },
    ];
  });

  emitter.on('serve', async (args) => {
    return serve(args);
  });
}
