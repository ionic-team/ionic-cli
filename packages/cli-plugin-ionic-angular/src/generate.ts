import * as AppScriptsType from '@ionic/app-scripts';

import { CLIEventEmitterGenerateEventArgs, load } from '@ionic/cli-utils';
import { minimistOptionsToArray } from './utils/arguments';

import { prompt, tabsPrompt } from './utils/generate';

export async function generate(args: CLIEventEmitterGenerateEventArgs): Promise<string[]> {
  const appScriptsArgs = minimistOptionsToArray(args.options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = load('@ionic/app-scripts');
  const context = AppScripts.generateContext();

  const [ type, name ] = args.inputs;

  switch (type) {
    case 'page':
      return await AppScripts.processPageRequest(context, name);
    case 'component':
      const componentData = await promptQuestions('component', context);
      return await AppScripts.processComponentRequest(context, name, componentData);
    case 'directive':
      const directiveData = await promptQuestions('directive', context);
      return await AppScripts.processDirectiveRequest(context, name, directiveData);
    case 'pipe':
      const pipeData = await promptQuestions('pipe', context);
      return await AppScripts.processPipeRequest(context, name, pipeData);
    case 'provider':
      const providerData = await promptQuestions('provider', context);
      return await AppScripts.processProviderRequest(context, name, providerData);
    case 'tabs':
      const tabsData = await tabsPromptQuestions();
      await AppScripts.processTabsRequest(context, name, tabsData); // TODO: match return type
  }

  return [];
}

async function promptQuestions(name: string, context: AppScriptsType.BuildContext) {
  return await prompt(name, context);
}

async function tabsPromptQuestions() {
  return await tabsPrompt();
}
