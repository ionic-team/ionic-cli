import { runCommand, IonicEnvironment, getCommandMetadataList } from '@ionic/cli-utils';
import { IonicNamespace } from './commands';

export async function run(envInstance: IonicEnvironment): Promise<void>  {
  const ionicNamespace = new IonicNamespace();

  await runCommand({
    namespace: ionicNamespace,
    ...envInstance
  });
}

export function getAllCommandMetadata(): any[] {
  const ionicNamespace = new IonicNamespace();
  return getCommandMetadataList(ionicNamespace);
}
