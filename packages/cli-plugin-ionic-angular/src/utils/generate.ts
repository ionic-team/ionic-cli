import * as path from 'path';

import * as AppScriptsType from '@ionic/app-scripts';
import { load } from '../lib/modules';

export async function getPages(context: AppScriptsType.BuildContext) {
  const AppScripts = load('@ionic/app-scripts');
  const pages = await AppScripts.getNgModules(context, ['page', 'component']);
  const ngModuleSuffix = await AppScripts.getStringPropertyValue('IONIC_NG_MODULE_FILENAME_SUFFIX');

  return pages.map((page) => {
    return {
      fileName: path.basename(page.absolutePath, ngModuleSuffix),
      absolutePath: page.absolutePath,
      relativePath: path.relative(context.rootDir, page.absolutePath)
    };
  });
}

export async function prompt(context: AppScriptsType.BuildContext) {
  return context.appNgModulePath;
}

export async function tabsPrompt() {
  const tabNames = [];

  const inquirer = load('inquirer');
  const howManyQuestion = await inquirer.prompt({
    name: 'howMany',
    message: 'How many tabs?'
  });

  for (let i = 0; i < howManyQuestion.howMany; i++) {
    const nameQuestion = await inquirer.prompt({
      name: 'tabName',
      message: 'Name of this tab:'
    });
    tabNames.push(nameQuestion.tabName);
  }
  return tabNames;
}
