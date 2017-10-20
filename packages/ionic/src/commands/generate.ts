import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandPreRun } from '@ionic/cli-utils';
import { contains, validators } from '@ionic/cli-framework/lib';
import { Command, CommandMetadata } from '@ionic/cli-utils/lib/command';
import { FatalException } from '@ionic/cli-utils/lib/errors';

const TYPE_CHOICES = ['component', 'directive', 'page', 'pipe', 'provider', 'tabs'];

@CommandMetadata({
  name: 'generate',
  type: 'project',
  description: `Generate pipes, components, pages, directives, providers, and tabs ${chalk.bold(`(ionic-angular >= 3.0.0)`)}`,
  longDescription: `
Automatically create components for your Ionic app.

The given ${chalk.green('name')} is normalized into an appropriate naming convention. For example, ${chalk.green('ionic generate page neat')} creates a page by the name of ${chalk.green('NeatPage')} in ${chalk.green('src/pages/neat/')}.
  `,
  exampleCommands: [
    '',
    ...TYPE_CHOICES,
    'component foo',
    'page Login',
    'page Detail --no-module',
    'page About --constants',
    'pipe MyFilterPipe'
  ],
  inputs: [
    {
      name: 'type',
      description: `The type of generator (e.g. ${TYPE_CHOICES.map(t => chalk.green(t)).join(', ')})`,
      validators: [contains(TYPE_CHOICES, {})],
    },
    {
      name: 'name',
      description: 'The name of the component being generated',
    }
  ],
  options: [
    {
      name: 'module',
      description: 'Do not generate an NgModule for the component',
      type: Boolean,
      default: true
    },
    {
      name: 'constants',
      description: 'Generate a page constant file for lazy-loaded pages',
      type: Boolean,
      default: false
    }
  ]
})
export class GenerateCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const project = await this.env.project.load();

    if (project.type !== 'ionic-angular') {
      throw new FatalException('Generators are only supported in Ionic Angular projects.');
    }

    if (!inputs[0]) {
      const generatorType = await this.env.prompt({
        type: 'list',
        name: 'generatorType',
        message: 'What would you like to generate:',
        choices: TYPE_CHOICES,
      });

      inputs[0] = generatorType;
    }

    if (!inputs[1]) {
      const generatorName = await this.env.prompt({
        type: 'input',
        name: 'generatorName',
        message: 'What should the name be?',
        validate: v => validators.required(v, 'name')
      });

      inputs[1] = generatorName;
    }

    if (!this.env.flags.interactive && inputs[0] === 'tabs') {
      throw new FatalException(`Cannot generate tabs without prompts. Run without ${chalk.green('--no-interactive')}.`);
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ type, name ] = inputs;

    const { generate } = await import('@ionic/cli-utils/lib/ionic-angular/generate');
    await generate({ env: this.env, inputs, options });

    this.env.log.ok(`Generated a ${chalk.bold(type)}${type === 'tabs' ? ' page' : ''} named ${chalk.bold(name)}!`);
  }
}
