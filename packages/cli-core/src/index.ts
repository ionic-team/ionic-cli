import { createCommandEnvironment, runCommand } from '@ionic/cli-utils';
import { CoreNamespace } from './commands';

export async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  const coreNamespace = new CoreNamespace();
  const commandEnvironment = await createCommandEnvironment(pargv, env, coreNamespace);

  await runCommand(commandEnvironment);
}
