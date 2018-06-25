import { CommandMap, Namespace, execute } from '@ionic/cli-framework';

export class IonicNgNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic-ng',
      summary: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([]);
  }
}

const namespace = new IonicNgNamespace();

export async function run(argv: string[], env: NodeJS.ProcessEnv) {
  await execute({ namespace, argv, env });
}
