import { CommandData, getCommandMetadataList, runCommand, IonicEnvironment } from '@ionic/cli-utils';
import { CordovaNamespace } from './commands';

export const PLUGIN_NAME = 'cordova';

export async function run(envInstance: IonicEnvironment): Promise<void>  {
  const cordovaNamespace = new CordovaNamespace();

  await runCommand({
    namespace: cordovaNamespace,
    ...envInstance
  });
}

export function getAllCommandMetadata() {
  const cordovaNamespace = new CordovaNamespace();
  return getCommandMetadataList(cordovaNamespace);
}
