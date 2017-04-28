import * as chalk from 'chalk';
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
      const ionicVersionFilePath = path.resolve(env.project.directory, 'www', 'lib', 'ionic', 'version.json'); // TODO

      try {
        const ionicVersionJson = await fsReadJsonFile(ionicVersionFilePath);
        return ionicVersionJson['version'];
      } catch (e) {
        env.log.error(`Error with ${chalk.bold(ionicVersionFilePath)} file: ${e}`);
      }
    };

    const ionic1Version = await getIonic1Version();

    return [
      { type: 'local-packages', name: 'Ionic Framework', version: ionic1Version ? `ionic1 ${ionic1Version}` : 'unknown' },
      { type: 'local-packages', name, version },
    ];
  });

  hooks.register(name, 'command:serve', async (args) => {
    return serve(args);
  });
}
