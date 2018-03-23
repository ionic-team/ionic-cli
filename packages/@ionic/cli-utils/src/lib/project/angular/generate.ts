import chalk from 'chalk';
import * as Debug from 'debug';
import * as lodash from 'lodash';
import * as through2 from 'through2';
import * as split2 from 'split2';

import { contains, unparseArgs, validators } from '@ionic/cli-framework';
import { columnar } from '@ionic/cli-framework/utils/format';
import { onBeforeExit } from '@ionic/cli-framework/utils/process';

import { importNgSchematics, importNgSchematicsTools } from './app-scripts';
import * as schematicsToolsLibType from '@angular-devkit/schematics/tools';

import { AngularGenerateOptions, CommandLineInputs, CommandLineOptions, CommandMetadata } from '../../../definitions';
import { GenerateRunner as BaseGenerateRunner } from '../../generate';
import { FatalException } from '../../errors';

const ANGULAR_SCHEMATICS_PACKAGE = '@schematics/angular';
const IONIC_SCHEMATICS_PACKAGE = '@ionic/schematics-angular';

const debug = Debug('ionic:cli-utils:lib:project:angular:generate');

const ANGULAR_SCHEMATICS_BLACKLIST = ['application', 'appShell', 'universal'];
const ANGULAR_SCHEMATICS_SIMPLE = ['class', 'interface', 'module', 'enum'];

function pluralizeGeneratorType(type: string): string {
  const suffix = type === 'class' ? 'es' : 's';
  return `${type}${suffix}`;
}

interface Schematic {
  type: string;
  description: string;
  collection: string;
  aliases: string[];
}

function generateAliasMap(schematics: Schematic[]): Map<string, string> {
  return new Map(lodash.flatten(schematics.map(s => [...s.aliases.map<[string, string]>(a => [a, s.type])])));
}

function extractSchematicsFromCollection(collection: schematicsToolsLibType.FileSystemCollection): Schematic[] {
  return lodash.toPairs(collection.description.schematics)
    .filter(([ k, v ]) => !ANGULAR_SCHEMATICS_BLACKLIST.includes(k))
    .map<Schematic>(([ type, v ]) => ({ type, description: v.description, collection: collection.description.name, aliases: v.aliases || [] }));
}

export function buildPathForGeneratorType(type: string, name: string): string {
  if (ANGULAR_SCHEMATICS_SIMPLE.includes(type)) {
    return name;
  }

  if (name.includes('/')) {
    return name;
  }

  return `${pluralizeGeneratorType(type)}/${name}`;
}

export class GenerateRunner extends BaseGenerateRunner<AngularGenerateOptions> {
  private schematics?: Schematic[];

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    const schematics = await this.getSchematics();
    const schematicNames = schematics.map(s => s.type);
    const schematicNamesAndAliases = [...schematicNames, ...lodash.flatten(schematics.map(s => s.aliases))];

    return {
      groups: [],
      summary: `Generate Angular classes such as pages, components, directives, services, etc.`,
      description: `
Automatically create components for your Ionic app.

This command uses the Angular CLI to generate components.

 - List generators with the ${chalk.green('--list')} option.
 - For a detailed list of options for each generator, use ${chalk.green('ng generate <type> --help')}.
 - For ${schematics.filter(s => s.collection === IONIC_SCHEMATICS_PACKAGE).map(t => chalk.green(t.type)).join(', ')} types, use ${chalk.green('ng generate <type> --help --collection @ionic/schematics-angular')}.

${chalk.green('ionic generate')} is more opinionated than ${chalk.green('ng generate')}. Aside from simpler generator types (${ANGULAR_SCHEMATICS_SIMPLE.map(t => chalk.green(pluralizeGeneratorType(t))).join(', ')}), generated files are placed in ${chalk.bold('src/app/<type>/<name>/')}. See the CLI documentation${chalk.cyan('[1]')} for an overview of recommended project structure.

Remember, you can use slashes in ${chalk.green('name')} to nest components deeper, but you must specify the full path within ${chalk.bold('src/app/')}. For example, specify a name of ${chalk.green('pages/tabs-page/tab1')} to generate page files at ${chalk.bold('src/app/pages/tabs-page/tab1/')}.

To test a generator before file modifications are made, use the ${chalk.green('--dry-run')} option.

${chalk.cyan('[1]')}: ${chalk.bold('https://ionicframework.com/docs/cli/projects.html#project-structure')}
      `,
      exampleCommands: [
        '--list',
        '-d',
        'page',
        'page contact',
        'component pages/contact/form',
        'component form --change-detection OnPush',
        'directive ripple --skip-import',
        's services/api/user',
      ],
      inputs: [
        {
          name: 'type',
          summary: `The type of generator (e.g. ${schematics.slice(0, 4).map(t => chalk.green(t.type)).join(', ')}; use ${chalk.green('--list')} to see all)`,
          validators: [validators.required, contains(schematicNamesAndAliases, {})],
        },
        {
          name: 'name',
          summary: 'The name of the component being generated',
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'list',
          summary: 'List available generators',
          type: Boolean,
          aliases: ['l'],
        },
        {
          name: 'dry-run',
          summary: 'Run generate without making any file changes',
          type: Boolean,
          aliases: ['d'],
        },
        {
          name: 'force',
          summary: 'Force overwriting of files',
          type: Boolean,
          aliases: ['f'],
        },
      ],
    };
  }

  async ensureCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const schematics = await this.getSchematics();

    if (schematics.length === 0) {
      throw new FatalException(`No suitable schematics found.`);
    }

    if (options['list']) {
      const headers = ['name', 'alias', 'description', 'collection'];
      this.log.rawmsg(columnar(schematics.map(({ type, description, collection, aliases }) => [chalk.green(type), aliases.map(a => chalk.green(a)).join(', '), description, chalk.green(collection)]), { headers }));
      throw new FatalException('', 0);
    }

    if (!inputs[0]) {
      const type = await this.prompt({
        type: 'list',
        name: 'type',
        message: 'What would you like to generate:',
        choices: schematics.map(t => t.type),
      });

      inputs[0] = type;
    }

    if (!inputs[1]) {
      const name = await this.prompt({
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
    const schematics = await this.getSchematics();

    const aliases = generateAliasMap(schematics);

    const type = aliases.get(options.type) || options.type;
    const schematic = schematics.find(s => s.type === type);

    if (!schematic) {
      throw new FatalException(`Unknown generator type: ${chalk.green(type)}`);
    }

    const name = buildPathForGeneratorType(type, options.name);

    debug(`${options.type} resolved to ${type}`);
    debug(`${options.name} normalized to ${name}`);

    try {
      await this.generateComponent(schematic, name, lodash.omit(options, 'type', 'name'));
    } catch (e) {
      debug(e);
      throw new FatalException(`Could not generate ${chalk.green(type)}.`);
    }

    if (!options.dryRun) {
      this.log.ok(`Generated ${chalk.green(type)}!`);
    }
  }

  private async getSchematics(): Promise<Schematic[]> {
    if (!this.schematics) {
      try {

        const { SchematicEngine } = await importNgSchematics(this.project.directory);
        const { NodeModulesEngineHost } = await importNgSchematicsTools(this.project.directory);

        const engineHost = new NodeModulesEngineHost();
        const engine = new SchematicEngine(engineHost);

        this.schematics = [
          ...extractSchematicsFromCollection(engine.createCollection(IONIC_SCHEMATICS_PACKAGE)),
          ...extractSchematicsFromCollection(engine.createCollection(ANGULAR_SCHEMATICS_PACKAGE)),
        ];
      } catch (e) {
        this.log.warn(`Could not load schematics for ${chalk.green('ionic generate')}. Use ${chalk.green('--verbose')} to debug.`);
        debug(`Error while loading schematics: ${e.stack ? e.stack : e}`);
        this.schematics = [];
      }
    }

    return this.schematics;
  }

  private async generateComponent(schematic: Schematic, name: string, options: { [key: string]: string | boolean; }) {
    if (schematic.collection !== ANGULAR_SCHEMATICS_PACKAGE) {
      options.collection = schematic.collection;
    }

    const ngArgs = unparseArgs({ _: ['generate', schematic.type, name], ...options }, {});
    const shellOptions = { cwd: this.project.directory };

    const p = await this.shell.spawn('ng', ngArgs, shellOptions);

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

      const log = this.log.clone({ wrap: false });
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
