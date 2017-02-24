import { getCommandMetadataList, runCommand, IonicEnvironment } from '@ionic/cli-utils';
import { PackageNamespace } from './commands';

export async function run(envInstance: IonicEnvironment): Promise<void>  {
  const packageNamespace = new PackageNamespace();

  await runCommand({
    namespace: packageNamespace,
    ...envInstance
  });
}

export function getAllCommandMetadata(): any[] {
  const packageNamespace = new PackageNamespace();
  return getCommandMetadataList(packageNamespace);
}
