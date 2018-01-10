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

const ns = new CLIScriptsNamespace();

export async function run(pargv: string[], env: { [k: string]: string; }) {
  await execute(ns, pargv, env);
}
