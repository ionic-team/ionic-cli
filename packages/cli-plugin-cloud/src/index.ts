import { createCommandEnvironment, runCommand } from '@ionic/cli-utils';
import { CloudNamespace } from './commands';

export default async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  const cloudNamespace = new CloudNamespace();
  const commandEnvironment = await createCommandEnvironment(pargv, env, cloudNamespace);

  await runCommand(commandEnvironment);
}
