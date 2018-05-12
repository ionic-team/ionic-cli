import { CommandMap, Namespace, execute } from '@ionic/cli-framework';

import { BuildCommand } from './commands';

export class IonicNgNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic-ng',
      summary: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([
      ['build', async () => new BuildCommand(this)],
    ]);
  }
}

const namespace = new IonicNgNamespace();

export async function run(argv: string[], env: { [key: string]: string; }) {
  await execute({ namespace, argv, env });
}
