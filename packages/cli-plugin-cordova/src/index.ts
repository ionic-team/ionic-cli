import { ICLIEventEmitter, getCommandInfo } from '@ionic/cli-utils';
import { CordovaNamespace } from './commands';

export const namespace = new CordovaNamespace();

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('info', async() => {
    const cordova = await getCommandInfo('cordova', ['-v']);
    return [['Cordova CLI', cordova]];
  });
}
