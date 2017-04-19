import * as path from 'path';

import { IHookEngine, fsReadJsonFile } from '@ionic/cli-utils';

import { serve } from './serve/index';

export const name = '__NAME__';
export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:docs', async () => {
    return 'https://ionicframework.com/docs/v1/';
  });

  hooks.register(name, 'command:info', async () => {
    const appDirectory = '.'; // TODO: change this
    const ionicVersionJson = await fsReadJsonFile(path.resolve(appDirectory, 'www', 'lib', 'ionic', 'version.json')); // TODO

    return [
      { type: 'local-npm', name: 'Ionic Framework', version: `ionic1 ${ionicVersionJson['version'] || 'unknown'}` },
      { type: 'local-npm', name, version },
    ];
  });

  hooks.register(name, 'command:serve', async (args) => {
    return serve(args);
  });
}
