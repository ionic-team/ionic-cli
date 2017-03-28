import * as AppScripts from '@ionic/app-scripts';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
  CLIEventEmitterGenerateEventArgs,
} from '@ionic/cli-utils';
import { minimistOptionsToArray } from './utils/arguments';

import { prompt, tabsPrompt } from './utils/generate';

export async function generate(args: CLIEventEmitterGenerateEventArgs): Promise<string[]> {
  const appScriptsArgs = minimistOptionsToArray(args.options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const appScripts: typeof AppScripts = require('@ionic/app-scripts');
  const context = appScripts.generateContext();

  const [ type, name ] = args.inputs;

  switch (type) {
    case 'page':
      return await appScripts.processPageRequest(context, name);
    case 'component':
      const componentData = await promptQuestions('component', appScripts, context);
      return await appScripts.processComponentRequest(context, name, componentData);
    case 'directive':
      const directiveData = await promptQuestions('directive', appScripts, context);
      return await appScripts.processDirectiveRequest(context, name, directiveData);
    case 'pipe':
      const pipeData = await promptQuestions('pipe', appScripts, context);
      return await appScripts.processPipeRequest(context, name, pipeData);
    case 'provider':
      const providerData = await promptQuestions('provider', appScripts, context);
      return await appScripts.processProviderRequest(context, name, providerData);
    case 'tabs':
      const tabsData = await tabsPromptQuestions(appScripts);
      await appScripts.processTabsRequest(context, name, tabsData); // TODO: match return type
  }

  return [];
}

async function promptQuestions(name: string, appScripts: typeof AppScripts, context: AppScripts.BuildContext) {
  return await prompt(name, appScripts, context);
}

async function tabsPromptQuestions(appScripts: typeof AppScripts) {
  return await tabsPrompt(appScripts);
}
