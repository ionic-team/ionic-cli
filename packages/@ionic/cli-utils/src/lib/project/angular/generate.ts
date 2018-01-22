import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { contains, unparseArgs, validators } from '@ionic/cli-framework';

import { AngularGenerateOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { GenerateRunner as BaseGenerateRunner } from '../../generate';
import { FatalException } from '../../errors';

const debug = Debug('ionic:cli-utils:lib:project:angular:generate');

const IONIC_GENERATOR_TYPES = ['page'];
const ANGULAR_GENERATOR_TYPES = ['class', 'component', 'directive', 'enum', 'guard', 'interface', 'module', 'pipe', 'service'];
const GENERATOR_TYPES = [...IONIC_GENERATOR_TYPES, ...ANGULAR_GENERATOR_TYPES];

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
      `,
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
    const [ type, name ] = inputs;

    return {
      ...lodash.omit(options, '_', '--', 'dry-run', 'd', 'force', 'f'),
      type,
      name,
      force: options['force'] ? true : false,
      dryRun: options['dry-run'] ? true : false,
    };
  }

  async run(options: AngularGenerateOptions) {
    try {
      await this.generateComponent(options.type, options.name, lodash.omit(options, 'type', 'name'));
    } catch (e) {
      debug(e);
      throw new FatalException(`Could not generate ${chalk.green(options.type)}.`);
    }

    this.env.log.ok(`Generated ${chalk.green(options.type)}!`);
  }

  async generateComponent(type: string, name: string, options: { [key: string]: string | boolean; }) {
    const { registerShutdownFunction } = await import('../../process');

    const ngArgs = unparseArgs({
      _: ['generate', type, name],
      collection: '@ionic/schematics-angular',
      ...options,
    }, {});

    const shellOptions = { cwd: this.env.project.directory, env: { FORCE_COLOR: chalk.enabled ? '1' : '0' } };

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

      registerShutdownFunction(() => p.kill());

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
