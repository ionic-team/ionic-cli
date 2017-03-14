import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  TaskChain,
  validators,
} from '@ionic/cli-utils';

import { load } from '../lib/utils/commonjs-loader';

@CommandMetadata({
  name: 'generate',
  aliases: ['g'],
  description: 'Generate pages and components',
  inputs: [
    {
      name: 'type',
      description: 'The type of generator that you would like to use',
      validators: [validators.required],
      prompt: {
        type: 'list',
        message: 'What would you like to generate:',
        choices: ['component', 'directive', 'page', 'pipe', 'provider', 'tabs']
      }
    },
    {
      name: 'name',
      description: 'What name that you like for the file:',
      validators: [validators.required],
      prompt: {
        message: 'name'
      }
    }
  ],
  requiresProject: true
})
export class GenerateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [, name ] = inputs;
    const tasks = new TaskChain();

    process.argv = ['node', 'appscripts'];
    const appScripts = load('@ionic/app-scripts');
    const context = appScripts.generateContext();

    tasks.next('Generating');

    await appScripts.processPageRequest(context, name);

    tasks.end();
  }
}
