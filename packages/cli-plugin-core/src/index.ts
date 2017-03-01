import { getCommandMetadataList, runCommand, IonicEnvironment } from '@ionic/cli-utils';
import { CoreNamespace } from './commands';

export async function run(envInstance: IonicEnvironment): Promise<void>  {
  const coreNamespace = new CoreNamespace();

  await runCommand({
    namespace: coreNamespace,
    ...envInstance
  });
}

export function getAllCommandMetadata(): any[] {
  const coreNamespace = new CoreNamespace();
  return getCommandMetadataList(coreNamespace);
}
