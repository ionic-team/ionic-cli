import chalk from 'chalk';

import { contains, unparseArgs, validators } from '@ionic/cli-framework';

import { CommandLineInputs, CommandLineOptions, CommandMetadata, IonicAngularGenerateOptions, IonicEnvironment } from '../../../definitions';
import { importAppScripts } from './app-scripts';
import { GenerateRunner as BaseGenerateRunner } from '../../generate';
import { FatalException } from '../../errors';

const GENERATOR_TYPES = ['component', 'directive', 'page', 'pipe', 'provider', 'tabs'];

export class GenerateRunner extends BaseGenerateRunner<IonicAngularGenerateOptions> {
  async getCommandMetadata(): Promise<Partial<CommandMetadata>> {
    return {
      groups: [],
      description: `Generate pipes, components, pages, directives, providers, and tabs`,
      longDescription: `
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
          name: 'module',
          description: 'Do not generate an NgModule for the component',
          type: Boolean,
          default: true,
        },
        {
          name: 'constants',
          description: 'Generate a page constant file for lazy-loaded pages',
          type: Boolean,
          default: false,
        },
      ],
    };
  }

  async ensureCommandLine(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    if (!inputs[0]) {
      const generatorType = await this.env.prompt({
        type: 'list',
        name: 'generatorType',
        message: 'What would you like to generate:',
        choices: GENERATOR_TYPES,
      });

      inputs[0] = generatorType;
    }

    if (!inputs[1]) {
      const generatorName = await this.env.prompt({
        type: 'input',
        name: 'generatorName',
        message: 'What should the name be?',
        validate: v => validators.required(v),
      });

      inputs[1] = generatorName;
    }

    if (!this.env.flags.interactive && inputs[0] === 'tabs') {
      throw new FatalException(`Cannot generate tabs without prompts. Run without ${chalk.green('--no-interactive')}.`);
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
    const AppScripts = await importAppScripts(this.env);

    const appScriptsArgs = unparseArgs({ _: [], module: options.module, constants: options.constants }, { useEquals: false, ignoreFalse: true, allowCamelCase: true });
    AppScripts.setProcessArgs(['node', 'appscripts'].concat(appScriptsArgs));
    AppScripts.setCwd(this.env.project.directory);

    const context = AppScripts.generateContext();

    switch (options.type) {
      case 'page':
        await AppScripts.processPageRequest(context, options.name, options);
        break;
      case 'component':
        const componentData = await getModules(context, 'component');
        await AppScripts.processComponentRequest(context, options.name, componentData);
        break;
      case 'directive':
        const directiveData = await getModules(context, 'directive');
        await AppScripts.processDirectiveRequest(context, options.name, directiveData);
        break;
      case 'pipe':
        const pipeData = await getModules(context, 'pipe');
        await AppScripts.processPipeRequest(context, options.name, pipeData);
        break;
      case 'provider':
        const providerData = context.appNgModulePath;
        await AppScripts.processProviderRequest(context, options.name, providerData);
        break;
      case 'tabs':
        const tabsData = await tabsPrompt(this.env);
        await AppScripts.processTabsRequest(context, options.name, tabsData, options);
        break;
    }

    this.env.log.ok(`Generated a ${chalk.bold(options.type)}${options.type === 'tabs' ? ' page' : ''} named ${chalk.bold(options.name)}!`);
  }
}

async function getModules(context: any, kind: string) {
  switch (kind) {
    case 'component':
      return context.componentsNgModulePath ? context.componentsNgModulePath : context.appNgModulePath;
    case 'pipe':
      return context.pipesNgModulePath ? context.pipesNgModulePath : context.appNgModulePath;
    case 'directive':
      return context.directivesNgModulePath ? context.directivesNgModulePath : context.appNgModulePath;
  }
}

export async function tabsPrompt(env: IonicEnvironment) {
  const tabNames = [];

  const howMany = await env.prompt({
    type: 'input',
    name: 'howMany',
    message: 'How many tabs?',
    validate: v => validators.numeric(v),
  });

  for (let i = 0; i < parseInt(howMany, 10); i++) {
    const tabName = await env.prompt({
      type: 'input',
      name: 'tabName',
      message: 'Name of this tab:',
    });

    tabNames.push(tabName);
  }

  return tabNames;
}
