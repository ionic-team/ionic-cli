import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  validators,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'generate',
  aliases: ['g'],
  description: 'Generates pipes, components, pages, directives, and tabs',
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
      description: 'The name of the component being generated',
      validators: [validators.required],
      prompt: {
        message: 'What should the name be?'
      }
    }
  ],
  requiresProject: true
})
export class GenerateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ type, name ] = inputs;

    await this.env.emitEvent('generate', {
      metadata: this.metadata,
      inputs,
      options
    });

    this.env.log.ok(`Generated a ${chalk.bold(type)} named ${chalk.bold(name)}!`);
  }
}
