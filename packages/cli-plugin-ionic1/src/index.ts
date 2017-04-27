import * as path from 'path';

import { IHookEngine, fsReadJsonFile } from '@ionic/cli-utils';

import { serve } from './serve/index';

export const name = '__NAME__';
export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:docs', async () => {
    return 'https://ionicframework.com/docs/v1/';
  });

  hooks.register(name, 'command:info', async ({ env }) => {
    if (!env.project.directory) {
      return [];
    }

    const getIonic1Version = async (): Promise<string | undefined> => {
      try {
        const ionicVersionJson = await fsReadJsonFile(path.resolve(env.project.directory, 'www', 'lib', 'ionic', 'version.json')); // TODO
        return ionicVersionJson['version'];
      } catch (e) {
        env.log.error(`Error with ionic version.json file: ${e}`);
      }
    };

    const ionic1Version = await getIonic1Version();

    return [
      { type: 'local-npm', name: 'Ionic Framework', version: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' },
      { type: 'local-npm', name, version },
    ];
  });

  hooks.register(name, 'command:serve', async (args) => {
    return serve(args);
  });
}
