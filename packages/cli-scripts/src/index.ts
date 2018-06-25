import { CommandMap, Namespace, execute } from '@ionic/cli-framework';

import { DocsCommand } from './docs';

class CLIScriptsNamespace extends Namespace {
  async getMetadata() {
    return {
      name: 'ionic-cli-scripts',
      summary: '',
    };
  }

  async getCommands(): Promise<CommandMap> {
    return new CommandMap([['docs', async () => new DocsCommand(this)]]);
  }
}

const namespace = new CLIScriptsNamespace();

export async function run(argv: string[], env: NodeJS.ProcessEnv) {
  await execute({ namespace, argv, env });
}
