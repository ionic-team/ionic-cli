import * as chalk from 'chalk';

import {
  Command,
  CommandLineInputs,
  CommandLineOptions,
  CommandMetadata,
  CommandPreRun,
  contains,
  promptToInstallProjectPlugin,
  registerPlugin,
  validators,
} from '@ionic/cli-utils';

const TYPE_CHOICES = ['component', 'directive', 'page', 'pipe', 'provider', 'tabs'];

@CommandMetadata({
  name: 'generate',
  type: 'project',
  description: `Generate pipes, components, pages, directives, providers, and tabs ${chalk.bold(`(ionic-angular >= 3.0.0)`)}`,
  longDescription: `
Automatically create components for your Ionic app.

The given ${chalk.green('name')} is normalized into an appropriate naming convention. For example, ${chalk.green('ionic generate page neat')} creates a page by the name of ${chalk.green('NeatPage')} in ${chalk.green('src/pages/neat/')}.
  `,
  exampleCommands: ['', ...TYPE_CHOICES, 'component foo', 'page Login', 'pipe MyFilterPipe'],
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
      description: 'Do not include a NgModule',
      type: Boolean,
      default: true
    }
  ]
})
export class GenerateCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const project = await this.env.project.load();

    if (project.type !== 'ionic-angular') {
      throw this.exit('Generators are only supported in Ionic Angular projects.');
    }

    // TODO: specific to Ionic Angular

    const hooks = this.env.hooks.getRegistered('command:generate');

    if (hooks.length === 0) {
      const plugin = await promptToInstallProjectPlugin(this.env, {
        message: `To use generators, you need to install ${chalk.green('@ionic/cli-plugin-ionic-angular')}. Install and continue?`,
      });

      if (plugin) {
        registerPlugin(this.env, plugin);
      } else {
        return 1;
      }
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
      this.env.log.error(`Cannot generate tabs without prompts. Run without ${chalk.green('--no-interactive')}.`);
      return 1;
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ type, name ] = inputs;
    await this.env.hooks.fire('command:generate', { cmd: this, env: this.env, inputs, options }); // TODO: print generated templates

    this.env.log.ok(`Generated a ${chalk.bold(type)}${type === 'tabs' ? ' page' : ''} named ${chalk.bold(name)}!`);
  }
}
