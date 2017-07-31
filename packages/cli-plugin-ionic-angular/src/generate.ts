import * as chalk from 'chalk';
import * as path from 'path';

import {
  CommandHookArgs,
  minimistOptionsToArray,
  prettyPath,
  readPackageJsonFile,
} from '@ionic/cli-utils';

import * as AppScriptsType from '@ionic/app-scripts';

import { load } from './lib/modules';
import { getModules, prompt, tabsPrompt } from './utils/generate';

export async function generate(args: CommandHookArgs): Promise<string[]> {
  if (!args.env.project.directory) {
    return [];
  }

  const appScriptsArgs = minimistOptionsToArray(args.options, { useEquals: false, ignoreFalse: true, allowCamelCase: true });
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

  const [ type, name ] = args.inputs;
  const commandOptions = {
    module: false,
    constants: false,
  };

  if (args.options['module']) {
    commandOptions.module = true;
  }

  if (args.options['constants']) {
    commandOptions.constants = true;
  }

  switch (type) {
    case 'page':
      await AppScripts.processPageRequest(context, name, commandOptions);
      break;
    case 'component':
      const componentData = await getModules(context, 'component');
      await AppScripts.processComponentRequest(context, name, componentData);
      break;
    case 'directive':
      const directiveData = await getModules(context, 'directive');
      await AppScripts.processDirectiveRequest(context, name, directiveData);
      break;
    case 'pipe':
      const pipeData = await getModules(context, 'pipe');
      await AppScripts.processPipeRequest(context, name, pipeData);
      break;
    case 'provider':
      const providerData = await promptQuestions(context);
      await AppScripts.processProviderRequest(context, name, providerData);
      break;
    case 'tabs':
      const tabsData = await tabsPrompt(args.env);
      await AppScripts.processTabsRequest(context, name, tabsData, commandOptions);
      break;
  }

  return [];
}

async function promptQuestions(context: AppScriptsType.BuildContext) {
  return await prompt(context);
}
