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
  description: `Generate pipes, components, pages, directives, and tabs ${chalk.bold(`(ionic-angular >= 3.0.0)`)}`,
  exampleCommands: ['', 'component', 'directive', 'page', 'pipe', 'provider', 'tabs', 'component foo', 'page Login', 'pipe MyFilterPipe'],
  inputs: [
    {
      name: 'type',
      description: `The type of generator (e.g. ${['page', 'component', 'tabs'].map(t => chalk.green(t)).join(', ')})`,
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

    await this.env.emitter.emit('generate', { inputs, options });

    this.env.log.ok(`Generated a ${chalk.bold(type)} named ${chalk.bold(name)}!`);
  }
}
