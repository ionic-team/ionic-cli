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
  description: 'Generate pages and components',
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
      description: 'The name of the file that gets generated',
      validators: [validators.required],
      prompt: {
        message: 'What would you like the name of this file to be:'
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
        tasks.next('Generating');

        await appScripts.processPageRequest(context, name);
        break;
      case 'component':
        context = appScripts.generateContext();
        const componentData = await this.promptQuestions('component', appScripts, context);

        tasks.next('Generating');
        await appScripts.processComponentRequest(context, name, componentData);
        break;
      case 'directive':
        context = appScripts.generateContext();
        const directiveData = await this.promptQuestions('directive', appScripts, context);

        tasks.next('Generating');
        await appScripts.processDirectiveRequest(context, name, directiveData);
        break;
      case 'pipe':
        context = appScripts.generateContext();
        const pipeData = await this.promptQuestions('pipe', appScripts, context);

        tasks.next('Generating');
        await appScripts.processPipeRequest(context, name, pipeData);
        break;
      case 'provider':
        context = appScripts.generateContext();
        const providerData = await this.promptQuestions('provider', appScripts, context);

        tasks.next('Generating');
        await appScripts.processProviderRequest(context, name, providerData);
      case 'tabs':
        context = appScripts.generateContext();
        const tabsData = await this.tabsPromptQuestions(appScripts, context);

        tasks.next('Generating');
        await appScripts.processTabsRequest(context, name, tabsData);
    }

    tasks.end();
  }

  private async getPages(appScripts: any, context: any) {
    const fileChoices: any[] = [];

    const pages = await appScripts.getNgModules(context, ['page', 'component']);

    pages.forEach((page: any) => {
      fileChoices.push({ fileName: path.basename(page.absolutePath, '.module.ts'), absolutePath: page.absolutePath });
    });

    return fileChoices;
  }

  private async promptQuestions(name: string, appScripts: any, context: any) {
    const usageQuestion = await this.env.inquirer.prompt({
      type: 'confirm',
      name: 'usage',
      message: `Will this ${name} be used in more than one template?`
    });

    if (!usageQuestion.usage) {
      const filteredChoices: any = [];
      const fileChoices = await this.getPages(appScripts, context);

      fileChoices.forEach((file) => {
        filteredChoices.push(file.fileName);
      });

      const usagePlaces = await this.env.inquirer.prompt({
        type: 'list',
        name: 'whereUsed',
        message: `Which page or component will be using this ${name}`,
        choices: filteredChoices
      });

      const chosenPath = fileChoices.find((file): any => {
        return file.fileName === usagePlaces.whereUsed;
      });

      return [usageQuestion, chosenPath.absolutePath];
    } else {
      return [usageQuestion];
    }
  }

  private async tabsPromptQuestions(appScripts: any, context: any) {
    const tabNames = [];

    const howManyQuestion = await this.env.inquirer.prompt({
      name: 'howMany',
      message: 'How many tabs do you need?'
    });

    for (let i = 0; i <= howManyQuestion.howMany; i++) {
      const nameQuestion = await this.env.inquirer.prompt({
        name: 'tabName',
        message: `What should the name of this tab be?`
      });
      tabNames.push(nameQuestion.tabName);
    }

    return [howManyQuestion, tabNames];
  }
}


