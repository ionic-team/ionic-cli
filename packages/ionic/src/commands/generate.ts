import {
  CommandLineInputs,
  CommandLineOptions,
  Command,
  CommandMetadata,
  TaskChain,
  validators,
} from '@ionic/cli-utils';

import * as fs from 'fs';

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
        tasks.next('Generating');

        await appScripts.processComponentRequest(context, name);
        break;
      case 'directive':
        context = appScripts.generateContext();
        tasks.next('Generating');

        await appScripts.processDirectiveRequest(context, name);
        break;
      case 'pipe':
        context = appScripts.generateContext();
        const pipeData = await this.genPipe(context);

        tasks.next('Generating');
        await appScripts.processPipeRequest(context, name, pipeData);
        break;
      case 'provider':
        context = appScripts.generateContext();
        tasks.next('Generating');

        await appScripts.processProviderRequest(context, name);
      case 'tabs':
        context = appScripts.generateContext();
        tasks.next('Generating');

        await appScripts.processTabsRequest(context, name);
    }

    tasks.end();
  }

  private async genPipe(context: any) {
    const pipeUsage = await this.env.inquirer.prompt({
      type: 'confirm',
      name: 'pipeUsage',
      message: 'Will this pipe be used in more than one template?'
    });

    if (!pipeUsage.pipeUsage) {
      let components;
      let fileChoices;

      if (fs.existsSync(context.componentsDir)) {
        components = fs.readdirSync(context.componentsDir);
      }
      const pages = fs.readdirSync(context.pagesDir);

      if (components !== undefined) {
        fileChoices = [...components, ...pages];
      } else {
        fileChoices = pages;
      }

      const pipePlaces = await this.env.inquirer.prompt({
        type: 'list',
        name: 'whereUsed',
        message: 'Which page or component will be using this pipe?',
        choices: fileChoices
      });

      return [pipeUsage, pipePlaces];
    } else {
      return [pipeUsage];
    }
  }
}


