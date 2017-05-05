import * as chalk from 'chalk';

import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandPreRun,
  CommandMetadata,
  installPlugin,
  promptToInstallProjectPlugin,
} from '@ionic/cli-utils';

@CommandMetadata({
  name: 'generate',
  type: 'project',
  description: `Generate pipes, components, pages, directives, providers, and tabs ${chalk.bold(`(ionic-angular >= 3.0.0)`)}`,
  exampleCommands: ['', 'component', 'directive', 'page', 'pipe', 'provider', 'tabs', 'component foo', 'page Login', 'pipe MyFilterPipe'],
  inputs: [
    {
      name: 'type',
      description: `The type of generator (e.g. ${['page', 'component', 'tabs'].map(t => chalk.green(t)).join(', ')})`,
    },
    {
      name: 'name',
      description: 'The name of the component being generated',
    }
  ],
})
export class GenerateCommand extends Command implements CommandPreRun {
  async preRun(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void | number> {
    const project = await this.env.project.load();

    if (project.type !== 'ionic-angular') {
      throw this.exit('Generators are only supported in Ionic Angular projects.');
    }

    // TODO: specific to Ionic Angular

    const TYPE_CHOICES = ['component', 'directive', 'page', 'pipe', 'provider', 'tabs'];
    const hooks = this.env.hooks.getRegistered('command:generate');

    if (hooks.length === 0) {
      const plugin = await promptToInstallProjectPlugin(this.env, {
        message: `To use generators, you need to install ${chalk.green('@ionic/cli-plugin-ionic-angular')}. Install and continue?`,
      });

      if (plugin) {
        installPlugin(this.env, plugin);
      } else {
        return 1;
      }
    }

    if (!inputs[0]) {
      const response = await this.env.prompt({
        type: 'list',
        name: 'type',
        message: 'What would you like to generate:',
        choices: TYPE_CHOICES,
      });

      inputs[0] = response['type'];
    }

    if (!TYPE_CHOICES.includes(inputs[0])) {
      throw this.exit(`${chalk.bold(inputs[0])} is not a valid generator type.`);
    }

    if (!inputs[1]) {
      const response = await this.env.prompt({
        name: 'name',
        message: 'What should the name be?',
      });

      inputs[1] = response['name'];
    }
  }

  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ type, name ] = inputs;

    await this.env.hooks.fire('command:generate', { env: this.env, inputs, options });

    this.env.log.ok(`Generated a ${chalk.bold(type)}${type === 'tabs' ? ' page' : ''} named ${chalk.bold(name)}!`);
  }
}
