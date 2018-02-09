import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { contains, unparseArgs, validators } from '@ionic/cli-framework';
import { onBeforeExit } from '@ionic/cli-framework/utils/process';

import { AngularGenerateOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { GenerateRunner as BaseGenerateRunner } from '../../generate';
import { FatalException } from '../../errors';

const debug = Debug('ionic:cli-utils:lib:project:angular:generate');

const IONIC_GENERATOR_TYPES = ['page'];
const ANGULAR_GENERATOR_TYPES = ['class', 'component', 'directive', 'enum', 'guard', 'interface', 'module', 'pipe', 'service'];
const GENERATOR_TYPES = [...IONIC_GENERATOR_TYPES, ...ANGULAR_GENERATOR_TYPES];
const SIMPLE_GENERATOR_TYPES = ['class', 'interface', 'module', 'enum'];

function pluralizeGeneratorType(type: string): string {
  const suffix = type === 'class' ? 'es' : 's';
  return `${type}${suffix}`;
}

export function buildPathForGeneratorType(type: string, name: string): string {
  if (SIMPLE_GENERATOR_TYPES.includes(type)) {
    return name;
  }

  if (name.includes('/')) {
    return name;
  }

  return `${pluralizeGeneratorType(type)}/${name}`;
}

export class GenerateRunner extends BaseGenerateRunner<AngularGenerateOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [],
      description: `Generate Angular classes such as pages, components, directives, services, etc.`,
      longDescription: `
Automatically create components for your Ionic app.

This command uses the Angular CLI to generate components. Not all component generation options are listed.

 - For a detailed list of options for each generator, use ${chalk.green('ng generate <type> --help')}.
 - For ${IONIC_GENERATOR_TYPES.map(t => chalk.green(t)).join(', ')} types, use ${chalk.green('ng generate <type> --help --collection @ionic/schematics-angular')}.

${chalk.green('ionic generate')} is more opinionated than ${chalk.green('ng generate')}. Aside from simpler generator types (${SIMPLE_GENERATOR_TYPES.map(t => chalk.green(pluralizeGeneratorType(t))).join(', ')}), generated files are placed in ${chalk.bold('src/app/<type>/<name>/')}. See the CLI documentation${chalk.cyan('[1]')} for an overview of recommended project structure.

Remember, you can use slashes in ${chalk.green('name')} to nest components deeper, but you must specify the full path within ${chalk.bold('src/app/')}. For example, specify a name of ${chalk.green('pages/tabs-page/tab1')} to generate page files at ${chalk.bold('src/app/pages/tabs-page/tab1/')}.

To test a generator before file modifications are made, use the ${chalk.green('--dry-run')} option.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/cli/projects.html#project-structure')}
      `,
      exampleCommands: [
        '-d',
      ],
      inputs: [
        {
          name: 'type',
          description: `The type of generator (e.g. ${GENERATOR_TYPES.map(t => chalk.green(t)).join(', ')})`,
          validators: [validators.required, contains(GENERATOR_TYPES, {})],
        },
        {
          name: 'name',
          description: 'The name of the component being generated',
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'dry-run',
          description: 'Run generate without making any file changes',
          type: Boolean,
          aliases: ['d'],
        },
        {
          name: 'force',
          description: 'Force overwriting of files',
          type: Boolean,
          aliases: ['f'],
        },
      ],
    };
  }

  async ensureCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!inputs[0]) {
      const type = await this.env.prompt({
        type: 'list',
        name: 'type',
        message: 'What would you like to generate:',
        choices: GENERATOR_TYPES,
      });

      inputs[0] = type;
    }

    if (!inputs[1]) {
      const name = await this.env.prompt({
        type: 'input',
        name: 'name',
        message: 'What should the name be?',
        validate: v => validators.required(v),
      });

      inputs[1] = name;
    }
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): AngularGenerateOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);

    return {
      ...lodash.omit(options, '_', '--', 'dry-run', 'd', 'force', 'f'),
      ...baseOptions,
      force: options['force'] ? true : false,
      dryRun: options['dry-run'] ? true : false,
    };
  }

  async run(options: AngularGenerateOptions) {
    const name = buildPathForGeneratorType(options.type, options.name);
    debug(`${options.name} normalized to ${name}`);

    try {
      await this.generateComponent(options.type, name, lodash.omit(options, 'type', 'name'));
    } catch (e) {
      debug(e);
      throw new FatalException(`Could not generate ${chalk.green(options.type)}.`);
    }

    if (!options.dryRun) {
      this.env.log.ok(`Generated ${chalk.green(options.type)}!`);
    }
  }

  async generateComponent(type: string, name: string, options: { [key: string]: string | boolean; }) {
    if (IONIC_GENERATOR_TYPES.includes(type)) {
      options.collection = '@ionic/schematics-angular';
    }

    const ngArgs = unparseArgs({ _: ['generate', type, name], ...options }, {});
    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0', ...process.env } };

    const p = await this.env.shell.spawn('ng', ngArgs, shellOptions);

    return new Promise<void>((resolve, reject) => {
      let errorsEncountered = false;

      p.on('error', err => {
        reject(err);
      });

      p.on('exit', code => {
        if (code === 0) {
          if (errorsEncountered) {
            reject(new Error(`Angular CLI encountered errors while generating components.`));
          } else {
            resolve();
          }
        } else {
          reject(new Error(`Angular CLI exited with error code: ${code}`));
        }
      });

      onBeforeExit(async () => p.kill());

      const log = this.env.log.clone({ wrap: false });
      const ws = log.createWriteStream();

      const stdoutStream = through2(function(chunk, env, callback) {
        const str = chunk.toString();

        if (str.includes('error!')) {
          errorsEncountered = true;
        }

        this.push(chunk);
        callback();
      });

      p.stdout.pipe(split2()).pipe(stdoutStream).pipe(ws);
      p.stderr.pipe(split2()).pipe(ws);
    });
  }
}
