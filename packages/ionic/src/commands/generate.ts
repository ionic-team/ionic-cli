import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  TaskChain,
  validators,
} from '@ionic/cli-utils';

import * as path from 'path';

import { load } from '../lib/utils/commonjs-loader';

@CommandMetadata({
  name: 'generate',
  aliases: ['g'],
  description: 'Generates pipes, components, pages, directives and tabs',
  inputs: [
    {
      name: 'type',
      description: 'The type of generator that you would like to use',
      validators: [validators.required],
      prompt: {
        type: 'list',
        message: 'What would you like to generate:',
        choices: ['component', 'directive', 'page', 'pipe', 'provider', 'tabs']
      }
    },
    {
      name: 'name',
      description: 'The name of the component being generated',
      validators: [validators.required],
      prompt: {
        message: 'What should the name be?'
      }
    }
  ],
  requiresProject: true
})
export class GenerateCommand extends Command {
  async run(inputs: CommandLineInputs, options: CommandLineOptions): Promise<void> {
    const [ type, name ] = inputs;
    const tasks = new TaskChain();

    let context;

    process.argv = ['node', 'appscripts'];
    const appScripts = load('@ionic/app-scripts');

    switch (type) {
      case 'page':
        context = appScripts.generateContext();
        tasks.next(`Generated a page named ${name}`);

        await appScripts.processPageRequest(context, name);
        break;
      case 'component':
        context = appScripts.generateContext();
        const componentData = await this.promptQuestions('component', appScripts, context);

        tasks.next(`Generated a component named ${name}`);
        await appScripts.processComponentRequest(context, name, componentData);
        break;
      case 'directive':
        context = appScripts.generateContext();
        const directiveData = await this.promptQuestions('directive', appScripts, context);

        tasks.next(`Generated a directive named ${name}`);
        await appScripts.processDirectiveRequest(context, name, directiveData);
        break;
      case 'pipe':
        context = appScripts.generateContext();
        const pipeData = await this.promptQuestions('pipe', appScripts, context);

        tasks.next(`Generated a pipe named ${name}`);
        await appScripts.processPipeRequest(context, name, pipeData);
        break;
      case 'provider':
        context = appScripts.generateContext();
        const providerData = await this.promptQuestions('provider', appScripts, context);

        tasks.next(`Generated a provider named ${name}`);
        await appScripts.processProviderRequest(context, name, providerData);
        break;
      case 'tabs':
        context = appScripts.generateContext();
        const tabsData = await this.tabsPromptQuestions(appScripts, context);

        tasks.next('Generated tabs');
        await appScripts.processTabsRequest(context, name, tabsData);
        break;
    }

    tasks.end();
  }

  private async getPages(appScripts: any, context: any) {
    const fileChoices: any[] = [];

    const pages = await appScripts.getNgModules(context, ['page', 'component']);

    pages.forEach((page: any) => {
      fileChoices.push({ fileName: path.basename(page.absolutePath, '.module.ts'), absolutePath: page.absolutePath, relativePath: path.relative(context.rootDir, page.absolutePath) });
    });

    return fileChoices;
  }

  private async promptQuestions(name: string, appScripts: any, context: any) {
    const usageQuestion = await this.env.inquirer.prompt({
      type: 'confirm',
      name: 'usage',
      message: `Use this ${name} in more than one template?`
    });

    if (!usageQuestion.usage) {
      const filteredChoices: any = [];
      const fileChoices = await this.getPages(appScripts, context);

      fileChoices.forEach((file) => {
        filteredChoices.push({ prettyName: path.dirname(file.relativePath), fullName: file.relativePath });
      });

      const usagePlaces = await this.env.inquirer.prompt({
        type: 'list',
        name: 'whereUsed',
        message: `Page or component that will be using this ${name}`,
        choices: filteredChoices.map((choiceObject: any) => {
          return choiceObject.prettyName;
        })
      });

      const chosenPath = fileChoices.find((file): any => {
        return path.dirname(file.relativePath) === usagePlaces.whereUsed;
      });
      return chosenPath.absolutePath;
    } else {
      return context.appNgModulePath;
    }
  }

  private async tabsPromptQuestions(appScripts: any, context: any) {
    const tabNames = [];

    const howManyQuestion = await this.env.inquirer.prompt({
      name: 'howMany',
      message: 'How many tabs?'
    });

    for (let i = 0; i < howManyQuestion.howMany; i++) {
      const nameQuestion = await this.env.inquirer.prompt({
        name: 'tabName',
        message: 'Name of this tab:'
      });
      tabNames.push(nameQuestion.tabName);
    }

    return tabNames;
  }
}


