import { IHookEngine, getCommandInfo } from '@ionic/cli-utils';
import { CordovaNamespace } from './commands';

export const name = '__NAME__';
export const version = '__VERSION__';

export const namespace = new CordovaNamespace();

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:info', async() => {
    const cordova = await getCommandInfo('cordova', ['-v']);
    return [
      { type: 'global-packages', name: 'Cordova CLI', version: cordova },
      { type: 'local-packages', name, version },
    ];
  });
}
