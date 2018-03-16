import { CommandMap, Namespace, execute } from '@ionic/cli-framework';

import { DocsCommand } from './docs';

class CLIScriptsNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic-cli-scripts',
      description: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([['docs', async () => new DocsCommand(this)]]);
  }
}

const namespace = new CLIScriptsNamespace();

export async function run(argv: string[], env: { [k: string]: string; }) {
  await execute({ namespace, argv, env });
}
