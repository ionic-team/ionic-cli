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
        tasks.next('Generating');

        await appScripts.processTabsRequest(context, name);
    }

    tasks.end();
  }

  private async getPages(appScripts: any, context: any) {
    const fileChoices: string[] = [];

    const pages = await appScripts.getNgModules(context, ['page', 'component']);

    pages.forEach((page: any) => {
      fileChoices.push(path.basename(page.absolutePath, '.module.ts'));
    });

    return fileChoices;
  }

  private async promptQuestions(name: string, appScripts: any, context: any) {
    const usageQuestion = await this.env.inquirer.prompt({
      type: 'confirm',
      name: `usage`,
      message: `Will this ${name} be used in more than one template?`
    });

    if (!usageQuestion.usage) {
      const fileChoices = await this.getPages(appScripts, context);

      const usagePlaces = await this.env.inquirer.prompt({
        type: 'list',
        name: 'whereUsed',
        message: `Which page or component will be using this ${name}`,
        choices: fileChoices
      });

      return [usageQuestion, usagePlaces];
    } else {
      return [usageQuestion];
    }
  }
}


