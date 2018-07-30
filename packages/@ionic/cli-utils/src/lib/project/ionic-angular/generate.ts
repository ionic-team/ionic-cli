import { contains, unparseArgs, validators } from '@ionic/cli-framework';
import chalk from 'chalk';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularGenerateOptions } from '../../../definitions';
import { GenerateRunner, GenerateRunnerDeps } from '../../generate';

import { IonicAngularProject } from './';
import { importAppScripts } from './app-scripts';

const GENERATOR_TYPES = ['component', 'directive', 'page', 'pipe', 'provider', 'tabs'];

export interface IonicAngularGenerateRunnerDeps extends GenerateRunnerDeps {
  readonly project: IonicAngularProject;
}

export class IonicAngularGenerateRunner extends GenerateRunner<IonicAngularGenerateOptions> {
  constructor(protected readonly e: IonicAngularGenerateRunnerDeps) {
    super();
  }

  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [],
      summary: `Generate pipes, components, pages, directives, providers, and tabs`,
      description: `
Automatically create components for your Ionic app.

The given ${chalk.green('name')} is normalized into an appropriate naming convention. For example, ${chalk.green('ionic generate page neat')} creates a page by the name of ${chalk.green('NeatPage')} in ${chalk.green('src/pages/neat/')}.
      `,
      exampleCommands: [
        '',
        ...GENERATOR_TYPES,
        'component foo',
        'page Login',
        'page Detail --no-module',
        'page About --constants',
        'pipe MyFilterPipe',
      ],
      inputs: [
        {
          name: 'type',
          summary: `The type of generator (e.g. ${GENERATOR_TYPES.map(t => chalk.green(t)).join(', ')})`,
          validators: [validators.required, contains(GENERATOR_TYPES, {})],
        },
        {
          name: 'name',
          summary: 'The name of the component being generated',
          validators: [validators.required],
        },
      ],
      options: [
        {
          name: 'module',
          summary: 'Do not generate an NgModule for the component',
          type: Boolean,
          default: true,
        },
        {
          name: 'constants',
          summary: 'Generate a page constant file for lazy-loaded pages',
          type: Boolean,
          default: false,
        },
      ],
    };
  }

  async ensureCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!inputs[0]) {
      const generatorType = await this.e.prompt({
        type: 'list',
        name: 'generatorType',
        message: 'What would you like to generate:',
        choices: GENERATOR_TYPES,
      });

      inputs[0] = generatorType;
    }

    if (!inputs[1]) {
      const generatorName = await this.e.prompt({
        type: 'input',
        name: 'generatorName',
        message: 'What should the name be?',
        validate: v => validators.required(v),
      });

      inputs[1] = generatorName;
    }
  }

  createOptionsFromCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): IonicAngularGenerateOptions {
    const baseOptions = super.createOptionsFromCommandLine(inputs, options);

    return {
      ...baseOptions,
      module: options['module'] ? true : false,
      constants: options['constants'] ? true : false,
    };
  }

  async run(options: IonicAngularGenerateOptions) {
    const AppScripts = await importAppScripts(this.e.project.directory);

    const appScriptsArgs = unparseArgs({ _: [], module: options.module, constants: options.constants }, { useEquals: false, ignoreFalse: true, allowCamelCase: true });
    AppScripts.setProcessArgs(['node', 'appscripts'].concat(appScriptsArgs));
    AppScripts.setCwd(this.e.project.directory);

    const context = AppScripts.generateContext();

    switch (options.type) {
      case 'page':
        await AppScripts.processPageRequest(context, options.name, options);
        break;
      case 'component':
        const componentData = await this.getModules(context, 'component');
        await AppScripts.processComponentRequest(context, options.name, componentData);
        break;
      case 'directive':
        const directiveData = await this.getModules(context, 'directive');
        await AppScripts.processDirectiveRequest(context, options.name, directiveData);
        break;
      case 'pipe':
        const pipeData = await this.getModules(context, 'pipe');
        await AppScripts.processPipeRequest(context, options.name, pipeData);
        break;
      case 'provider':
        const providerData = context.appNgModulePath;
        await AppScripts.processProviderRequest(context, options.name, providerData);
        break;
      case 'tabs':
        const tabsData = await this.tabsPrompt();
        await AppScripts.processTabsRequest(context, options.name, tabsData, options);
        break;
    }

    this.e.log.ok(`Generated a ${chalk.bold(options.type)}${options.type === 'tabs' ? ' page' : ''} named ${chalk.bold(options.name)}!`);
  }

  async tabsPrompt() {
    const tabNames = [];

    const howMany = await this.e.prompt({
      type: 'input',
      name: 'howMany',
      message: 'How many tabs?',
      validate: v => validators.numeric(v),
    });

    for (let i = 0; i < parseInt(howMany, 10); i++) {
      const tabName = await this.e.prompt({
        type: 'input',
        name: 'tabName',
        message: 'Name of this tab:',
      });

      tabNames.push(tabName);
    }

    return tabNames;
  }

  async getModules(context: any, kind: string) {
    switch (kind) {
      case 'component':
        return context.componentsNgModulePath ? context.componentsNgModulePath : context.appNgModulePath;
      case 'pipe':
        return context.pipesNgModulePath ? context.pipesNgModulePath : context.appNgModulePath;
      case 'directive':
        return context.directivesNgModulePath ? context.directivesNgModulePath : context.appNgModulePath;
    }
  }
}
