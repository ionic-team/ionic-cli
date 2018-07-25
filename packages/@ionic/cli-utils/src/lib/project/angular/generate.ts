import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';

import { CommandGroup, unparseArgs, validators } from '@ionic/cli-framework';

import { AngularGenerateOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { GLOBAL_OPTIONS } from '../../config';
import { FatalException } from '../../errors';
import { GenerateRunner } from '../../generate';

// https://github.com/ionic-team/ionic-cli/blob/develop/packages/%40ionic/schematics-angular/collection.json
const SCHEMATICS: ReadonlyArray<string> = ['page', 'component', 'service', 'module', 'class', 'directive', 'guard', 'pipe', 'interface', 'enum'];
const SCHEMATIC_ALIAS = new Map<string, string>([
  ['pg', 'page'],
  ['cl', 'class'],
  ['c', 'component'],
  ['d', 'directive'],
  ['e', 'enum'],
  ['g', 'guard'],
  ['i', 'interface'],
  ['m', 'module'],
  ['p', 'pipe'],
  ['s', 'service'],
]);

const debug = Debug('ionic:cli-utils:lib:project:angular:generate');

export class AngularGenerateRunner extends GenerateRunner<AngularGenerateOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [CommandGroup.Beta],
      description: `
This command uses the Angular CLI to generate features such as ${['pages', 'components', 'directives', 'services'].map(c => chalk.green(c)).join(', ')}, etc.

 - For a full list of available types, use ${chalk.green('npx ng g --help')}
 - For a list of options for a types, use ${chalk.green('npx ng g <type> --help')}

You can specify a path to nest your feature within any number of subdirectories. For example, specify a name of ${chalk.green('"pages/New Page"')} to generate page files at ${chalk.bold('src/app/pages/new-page/')}.

To test a generator before file modifications are made, use the ${chalk.green('--dry-run')} option.
      `,
      exampleCommands: [
        'page',
        'page contact',
        'component contact/form',
        'component login-form --change-detection=OnPush',
        'directive ripple --skip-import',
        'service api/user',
      ],
      inputs: [
        {
          name: 'type',
          summary: `The type of feature (e.g. ${['page', 'component', 'directive', 'service'].map(c => chalk.green(c)).join(', ')})`,
          validators: [validators.required],
        },
        {
          name: 'name',
          summary: 'The name/path of the feature being generated',
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
        message: 'What would you like to generate?',
        choices: SCHEMATICS,
      });

      inputs[0] = type;
    }

    if (!inputs[1]) {
      const type = SCHEMATIC_ALIAS.get(inputs[0]) || inputs[0];
      const name = await this.prompt({
        type: 'input',
        name: 'name',
        message: `Name/path of ${chalk.green(type)}:`,
        validate: v => validators.required(v),
      });

      inputs[1] = name.trim();
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
    const { name } = options;
    const type = SCHEMATIC_ALIAS.get(options.type) || options.type;

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
