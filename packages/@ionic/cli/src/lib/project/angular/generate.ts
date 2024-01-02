import { unparseArgs, validators } from '@ionic/cli-framework';
import { debug as Debug } from 'debug';
import * as lodash from 'lodash';

import { AngularGenerateOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { ancillary, input, strong } from '../../color';
import { GLOBAL_OPTIONS } from '../../config';
import { FatalException } from '../../errors';
import { GenerateRunner, GenerateRunnerDeps } from '../../generate';

import { AngularProject } from './';

// https://github.com/ionic-team/angular-toolkit/blob/master/collection.json
const SCHEMATICS: readonly string[] = ['page', 'component', 'service', 'module', 'class', 'directive', 'guard', 'pipe', 'interface', 'enum'];
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

const debug = Debug('ionic:lib:project:angular:generate');

export interface AngularGenerateRunnerDeps extends GenerateRunnerDeps {
  readonly project: AngularProject;
}

export class AngularGenerateRunner extends GenerateRunner<AngularGenerateOptions> {
  constructor(protected readonly e: AngularGenerateRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      description: `
Automatically create framework features with Ionic Generate. This command uses the Angular CLI to generate features such as ${['pages', 'components', 'directives', 'services'].map(c => input(c)).join(', ')}, and more.

 - For a full list of available types, use ${input('npx ng g --help')}
 - For a list of options for a types, use ${input('npx ng g <type> --help')}

You can specify a path to nest your feature within any number of subdirectories. For example, specify a name of ${input('"pages/New Page"')} to generate page files at ${strong('src/app/pages/new-page/')}.

To test a generator before file modifications are made, use the ${input('--dry-run')} option.
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
          name: 'schematic',
          summary: `The type of feature (e.g. ${['page', 'component', 'directive', 'service'].map(c => input(c)).join(', ')})`,
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
    if (inputs[0]) {
      this.validateFeatureType(inputs[0]);
    } else {
      const schematic = await this.e.prompt({
        type: 'list',
        name: 'schematic',
        message: 'What would you like to generate?',
        choices: SCHEMATICS,
      });

      inputs[0] = schematic;
    }

    if (!inputs[1]) {
      const schematic = SCHEMATIC_ALIAS.get(inputs[0]) || inputs[0];
      const name = await this.e.prompt({
        type: 'input',
        name: 'name',
        message: `Name/path of ${input(schematic)}:`,
        validate: v => validators.required(v),
      });

      inputs[1] = name.trim();
    }
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularGenerateOptions {
    const [schematic, name] = inputs;
    const baseOptions = { name, schematic }
    const project = options['project'] ? String(options['project']) : 'app';

    // TODO: this is a little gross, is there a better way to pass in all the
    // options that the command got?
    return {
      ...lodash.omit(options, '_', '--', ...GLOBAL_OPTIONS.map(opt => opt.name)),
      project,
      ...baseOptions,
    };
  }

  async run(options: AngularGenerateOptions) {
    const { name } = options;
    const schematic = SCHEMATIC_ALIAS.get(options.schematic) || options.schematic;

    try {
      await this.generateComponent(schematic, name, lodash.omit(options, 'schematic', 'name'));
    } catch (e: any) {
      debug(e);
      throw new FatalException(`Could not generate ${input(schematic)}.`);
    }

    if (!options['dry-run']) {
      this.e.log.ok(`Generated ${input(schematic)}!`);
    }
  }

  private validateFeatureType(schematic: string) {
    if (schematic === 'provider') {
      throw new FatalException(
        `Please use ${input('ionic generate service')} for generating service providers.\n` +
        `For more information, please see the Angular documentation${ancillary('[1]')} on services.\n\n` +
        `${ancillary('[1]')}: ${strong('https://angular.io/guide/architecture-services')}`
      );
    }

    if (!SCHEMATICS.includes(schematic) && !SCHEMATIC_ALIAS.get(schematic)) {
      throw new FatalException(
        `${input(schematic)} is not a known feature.\n` +
        `Use ${input('npx ng g --help')} to list available types of features.`
      );
    }
  }

  private async generateComponent(schematic: string, name: string, options: { [key: string]: string | boolean; }) {
    const args = {
      _: ['generate', schematic, name],
      // convert `--no-<opt>` style options to `--<opt>=false`
      ...lodash.mapValues(options, v => v === false ? 'false' : v),
    };

    await this.e.shell.run(
      'ng',
      unparseArgs(args, { useEquals: true }),
      { cwd: this.e.ctx.execPath, stdio: 'inherit' }
    );
  }
}
