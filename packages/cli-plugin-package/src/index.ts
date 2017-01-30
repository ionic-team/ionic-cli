import { getCommandMetadataList, createCommandEnvironment, runCommand } from '@ionic/cli-utils';
import { AppsNamespace } from './commands';

export async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  const appsNamespace = new AppsNamespace();
  const commandEnvironment = await createCommandEnvironment(pargv, env, appsNamespace);

  await runCommand(commandEnvironment);
}

export function getAllCommandMetadata(): any[] {
  const appsNamespace = new AppsNamespace();
  return getCommandMetadataList(appsNamespace);
}
