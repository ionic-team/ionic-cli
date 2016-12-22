import { execNamespace } from '@ionic/cli-utils';
import { IonicNamespace } from './commands';

export async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  return execNamespace(pargv, env, IonicNamespace);
}
