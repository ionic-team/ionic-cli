import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { CommandGroup, unparseArgs, validators } from '@ionic/cli-framework';

import { AngularGenerateOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { GLOBAL_OPTIONS } from '../../config';
import { FatalException } from '../../errors';
import { GenerateRunner as BaseGenerateRunner } from '../../generate';

const SCHEMATICS: ReadonlyArray<string> = ['page', 'component', 'service', 'module', 'class', 'directive', 'guard', 'pipe', 'interface', 'enum'];

const debug = Debug('ionic:cli-utils:lib:project:angular:generate');

function pluralizeType(type: string): string {
  const suffix = type === 'class' ? 'es' : 's';
  return `${type}${suffix}`;
}

export class GenerateRunner extends BaseGenerateRunner<AngularGenerateOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [CommandGroup.Experimental],
      description: `
This command uses the Angular CLI to generate ${['pages', 'components', 'directives', 'services'].map(c => chalk.green(c)).join(', ')}, etc.

 - For a full list of available schematics, use ${chalk.green('npx ng g --help')}
 - For a list of options for a schematic, use ${chalk.green('npx ng g <schematic> --help')}

We recommend prefixing ${chalk.green('name')} with a consistent, descriptive path within ${chalk.bold('src/app/')}, otherwise the app will quickly become cluttered. For example, for ${chalk.green('pages')}, try ${chalk.green('ionic g page pages/my-new-page')}.

You can nest components deeper inside other components. For example, specify a name of ${chalk.green('pages/tabs-page/tab1')} to generate page files at ${chalk.bold('src/app/pages/tabs-page/tab1/')}.

To test a generator before file modifications are made, use the ${chalk.green('--dry-run')} option.

${chalk.green('ionic generate')} differs from ${chalk.green('ng generate')}:

 1. ${chalk.green('ionic generate')} will prompt for ${chalk.green('type')} and ${chalk.green('name')} if not provided.
 2. The prompts will always prefix the specified ${chalk.green('name')} with a directory (e.g. ${chalk.green('login-page')} => ${chalk.green('pages/login-page')}).
      `,
      exampleCommands: [
        'page',
        'page pages/contact',
        'component pages/contact/form',
        'component components/login-form --change-detection=OnPush',
        'directive directives/ripple --skip-import',
        'service services/api/user',
      ],
      inputs: [
        {
          name: 'type',
          summary: `The type of generator (e.g. ${['page', 'component', 'directive', 'service'].map(c => chalk.green(c)).join(', ')})`,
          validators: [validators.required],
        },
        {
          name: 'name',
          summary: 'The name of the component being generated',
          validators: [validators.required],
        },
      ],
    };
  }

  async ensureCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!inputs[0]) {
      const type = await this.prompt({
        type: 'list',
        name: 'type',
        message: 'What would you like to generate:',
        choices: SCHEMATICS,
      });

      inputs[0] = type;
    }

    if (!inputs[1]) {
      const name = await this.prompt({
        type: 'input',
        name: 'name',
        message: 'What should the name be?',
        validate: v => validators.required(v),
        filter: input => `${pluralizeType(inputs[0])}/${input}`,
      });

      inputs[1] = name;
    }
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularGenerateOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);

    // TODO: this is a little gross, is there a better way to pass in all the
    // options that the command got?
    return {
      ...lodash.omit(options, '_', '--', ...GLOBAL_OPTIONS.map(opt => opt.name)),
      project: options['project'],
      ...baseOptions,
    };
  }

  async run(options: AngularGenerateOptions) {
    const { type, name } = options;

    try {
      await this.generateComponent(type, name, lodash.omit(options, 'type', 'name'));
    } catch (e) {
      debug(e);
      throw new FatalException(`Could not generate ${chalk.green(type)}.`);
    }

    if (!options['dry-run']) {
      this.log.ok(`Generated ${chalk.green(type)}!`);
    }
  }

  private async generateComponent(type: string, name: string, options: { [key: string]: string | boolean; }) {
    const ngArgs = unparseArgs({ _: ['generate', type, name], ...options }, {});
    const shellOptions = { cwd: this.project.directory };

    await this.shell.run('ng', ngArgs, shellOptions);
  }
}
