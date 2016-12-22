import { createCommandEnvironment, runCommand } from '@ionic/cli-utils';
import { IonicNamespace } from './commands';

export async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  const ionicNamespace = new IonicNamespace();
  const commandEnvironment = await createCommandEnvironment(pargv, env, ionicNamespace);

  await runCommand(commandEnvironment);
}
