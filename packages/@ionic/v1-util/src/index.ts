import { execute } from '@ionic/cli-framework/lib';

import { ServeCommand } from './commands';
import { CommandMap, Namespace } from './lib';

export class IonicV1Namespace extends Namespace {
  metadata = {
    name: 'ionic-lab',
    description: '',
  };

  commands = new CommandMap([['serve', async () => new ServeCommand()]]);
}


const ns = new IonicV1Namespace();

export async function run(pargv: string[], env: { [key: string]: string; }) {
  await execute(ns, pargv.slice(2), env);
}
