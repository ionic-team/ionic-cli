import { ICLIEventEmitter, getCommandInfo } from '@ionic/cli-utils';
import { CordovaNamespace } from './commands';

export const version = '__VERSION__';

export const namespace = new CordovaNamespace();

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('info', async() => {
    const cordova = await getCommandInfo('cordova', ['-v']);
    return [
      { type: 'global-npm', name: 'cordova', version: cordova },
      { type: 'local-npm', name: '@ionic/cli-plugin-cordova', version: version },
    ];
  });
}
