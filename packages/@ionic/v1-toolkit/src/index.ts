import { CommandMap, Namespace, execute } from '@ionic/cli-framework';

import { BuildCommand, ServeCommand } from './commands';

export class IonicV1Namespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic-v1',
      description: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => new BuildCommand(this)],
      ['serve', async () => new ServeCommand(this)],
    ]);
  }
}

const namespace = new IonicV1Namespace();

export async function run(argv: string[], env: { [key: string]: string; }) {
  await execute({ namespace, argv, env });
}
