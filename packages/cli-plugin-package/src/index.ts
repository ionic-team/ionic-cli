import { getCommandMetadataList, createCommandEnvironment, runCommand } from '@ionic/cli-utils';
import { PackageNamespace } from './commands';

export async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  const packageNamespace = new PackageNamespace();
  const commandEnvironment = await createCommandEnvironment(pargv, env, packageNamespace);

  await runCommand(commandEnvironment);
}

export function getAllCommandMetadata(): any[] {
  const packageNamespace = new PackageNamespace();
  return getCommandMetadataList(packageNamespace);
}
