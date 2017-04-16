import * as path from 'path';

import { IHookEngine, fsReadJsonFile } from '@ionic/cli-utils';

import { serve } from './serve/index';

export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register('docs', async () => {
    return 'https://ionicframework.com/docs/v1/';
  });

  hooks.register('info', async () => {
    const appDirectory = '.'; // TODO: change this
    const ionicVersionJson = await fsReadJsonFile(path.resolve(appDirectory, 'www', 'lib', 'ionic', 'version.json')); // TODO

    return [
      { type: 'local-npm', name: 'Ionic Framework', version: `ionic1 ${ionicVersionJson['version'] || 'unknown'}` },
      { type: 'local-npm', name: '@ionic/cli-plugin-ionic1', version: version },
    ];
  });

  hooks.register('serve', async (args) => {
    return serve(args);
  });
}
