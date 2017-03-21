import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  TaskChain,
  validators,
} from '@ionic/cli-utils';

import { load } from '../lib/utils/commonjs-loader';

import { prompt, tabsPrompt } from '../lib/generate';

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

  private async promptQuestions(name: string, appScripts: any, context: any) {
    const inquirer = this.env.inquirer;
    return await prompt(name, appScripts, context, inquirer);
  }

  private async tabsPromptQuestions(appScripts: any) {
    const inquirer = this.env.inquirer;
    return await tabsPrompt(appScripts, inquirer);
  }
}


