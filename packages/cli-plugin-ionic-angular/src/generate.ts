import * as chalk from 'chalk';
import * as path from 'path';

import * as AppScriptsType from '@ionic/app-scripts';
import { CommandHookArgs, readPackageJsonFile, prettyPath } from '@ionic/cli-utils';

import { load } from './lib/modules';
import { minimistOptionsToArray } from './utils/arguments';
import { prompt, tabsPrompt } from './utils/generate';

export async function generate(args: CommandHookArgs): Promise<string[]> {
  if (!args.env.project.directory) {
    return [];
  }

  const appScriptsArgs = minimistOptionsToArray(args.options);
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const ionicAngularPackageJsonFilePath = path.resolve(args.env.project.directory, 'node_modules', 'ionic-angular', 'package.json'); // TODO

  try {
    const ionicAngularPackageJson = await readPackageJsonFile(ionicAngularPackageJsonFilePath);

    if (ionicAngularPackageJson.version && Number(ionicAngularPackageJson.version.charAt(0)) < 3) {
      throw new Error(`The generate command is only available for projects that use ionic-angular >= 3.0.0`);
    }
  } catch (e) {
    args.env.log.error(`Error with ${chalk.bold(prettyPath(ionicAngularPackageJsonFilePath))} file: ${e}`);
  }

  const AppScripts = load('@ionic/app-scripts');
  const context = AppScripts.generateContext();

  const [type, name] = args.inputs;

  switch (type) {
    case 'page':
      return await AppScripts.processPageRequest(context, name);
    case 'component':
      const componentData = await promptQuestions(context);
      return await AppScripts.processComponentRequest(context, name, componentData);
    case 'directive':
      const directiveData = await promptQuestions(context);
      return await AppScripts.processDirectiveRequest(context, name, directiveData);
    case 'pipe':
      const pipeData = await promptQuestions(context);
      return await AppScripts.processPipeRequest(context, name, pipeData);
    case 'provider':
      const providerData = await promptQuestions(context);
      return await AppScripts.processProviderRequest(context, name, providerData);
    case 'tabs':
      const tabsData = await tabsPrompt(args.env);
      await AppScripts.processTabsRequest(context, name, tabsData); // TODO: match return type
  }

  return [];
}

async function promptQuestions(context: AppScriptsType.BuildContext) {
  return await prompt(context);
}
