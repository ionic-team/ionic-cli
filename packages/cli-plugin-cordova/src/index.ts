import { IHookEngine, getCommandInfo } from '@ionic/cli-utils';
import { CordovaNamespace } from './commands';

export const version = '__VERSION__';

export const namespace = new CordovaNamespace();

export function registerHooks(hooks: IHookEngine) {
  hooks.register('command:info', async() => {
    const cordova = await getCommandInfo('cordova', ['-v']);
    return [
      { type: 'global-npm', name: 'cordova', version: cordova },
      { type: 'local-npm', name: '@ionic/cli-plugin-cordova', version: version },
    ];
  });
}
