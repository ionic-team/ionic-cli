import { getCommandMetadataList, createCommandEnvironment, runCommand } from '@ionic/cli-utils';
import { CloudNamespace } from './commands';

export async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  const cloudNamespace = new CloudNamespace();
  const commandEnvironment = await createCommandEnvironment(pargv, env, cloudNamespace);

  await runCommand(commandEnvironment);
}

export function getAllCommandMetadata(): any[] {
  const cloudNamespace = new CloudNamespace();
  return getCommandMetadataList(cloudNamespace);
}
