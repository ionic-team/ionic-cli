import { execNamespace } from '@ionic/cli-utils';
import { CloudNamespace } from './commands';

export default async function run(pargv: string[], env: { [k: string]: string }): Promise<void>  {
  return execNamespace(pargv, env, CloudNamespace);
}
