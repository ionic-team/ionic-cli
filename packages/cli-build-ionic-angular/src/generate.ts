import * as AppScripts from '@ionic/app-scripts';
import * as semver from 'semver';

import {
  CommandLineInputs,
  CommandLineOptions,
  CommandData,
  getIonicInfo
} from '@ionic/cli-utils';
import { minimistOptionsToArray } from './utils/arguments';

import { prompt, tabsPrompt } from './utils/generate';

export async function generate(cmdMetadata: CommandData, inputs: CommandLineInputs, options: CommandLineOptions): Promise<string[]> {
  const appScriptsArgs = minimistOptionsToArray(options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const appScripts: typeof AppScripts = require('@ionic/app-scripts');
  const ionicInfo = await getIonicInfo();

  if (!semver.gte(ionicInfo.version, '3.0.0')) {
    throw new Error(`The generate command is only available for projects that use ionic-angular >= 3.0.0`);
  }

  const context = appScripts.generateContext();

  const [ type, name ] = inputs;

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

async function promptQuestions(name: string, appScripts: any, context: any) {
  return await prompt(name, appScripts, context);
}

async function tabsPromptQuestions(appScripts: any) {
  return await tabsPrompt(appScripts);
}
