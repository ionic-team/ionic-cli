import { execNamespace } from '@ionic/cli-utils';
import { CoreNamespace } from './commands';

export default async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  return execNamespace(pargv, env, CoreNamespace);
}
