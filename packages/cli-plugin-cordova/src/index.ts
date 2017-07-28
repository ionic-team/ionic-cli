import * as path from 'path';

import { IHookEngine, getCommandInfo } from '@ionic/cli-utils';
import { CordovaNamespace } from './commands';

export const name = '__NAME__';
export const version = '__VERSION__';

export const namespace = new CordovaNamespace();
namespace.source = name;

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:info', async () => {
    let cordovaPlatforms: string | undefined;
    const cordovaVersion = await getCommandInfo('cordova', ['-v', '--no-telemetry']);

    if (cordovaVersion) {
      cordovaPlatforms = await getCommandInfo('cordova', ['platform', 'ls', '--no-telemetry']);

      if (cordovaPlatforms) {
        cordovaPlatforms = cordovaPlatforms.replace(/\s+/g, ' ');
        cordovaPlatforms = cordovaPlatforms.replace('Installed platforms:', '');
        cordovaPlatforms = cordovaPlatforms.replace(/Available platforms.+/, '');
        cordovaPlatforms = cordovaPlatforms.trim();
      }
    }

    return [
      { type: 'global-packages', name: 'Cordova CLI', version: cordovaVersion || 'not installed' },
      { type: 'cli-packages', name, version, path: path.dirname(path.dirname(__filename)) },
      { type: 'local-packages', name: 'Cordova Platforms', version: cordovaPlatforms || 'none' },
    ];
  });

  hooks.register(name, 'build:after', async ({ env }) => {
    await env.runcmd(['cordova', 'prepare']);
  });
}
