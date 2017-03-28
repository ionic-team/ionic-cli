import * as path from 'path';

import * as AppScripts from '@ionic/app-scripts';
import { inquirer } from '@ionic/cli-utils';

export async function getPages(appScripts: typeof AppScripts, context: AppScripts.BuildContext) {
  const pages = await appScripts.getNgModules(context, ['page', 'component']);
  const ngModuleSuffix = await appScripts.getStringPropertyValue('IONIC_NG_MODULE_FILENAME_SUFFIX');

  return pages.map((page) => {
    return {
      fileName: path.basename(page.absolutePath, ngModuleSuffix),
      absolutePath: page.absolutePath,
      relativePath: path.relative(context.rootDir, page.absolutePath)
    };
  });
}

export async function prompt(type: string, appScripts: typeof AppScripts, context: AppScripts.BuildContext) {
  const usageQuestion = await inquirer.prompt({
    type: 'confirm',
    name: 'usage',
    message: `Use this ${type} in more than one template?`
  });

  if (!usageQuestion.usage) {
    const fileChoices = await getPages(appScripts, context);

    const filteredChoices = fileChoices.map((file) => {
      return {
        prettyName: path.dirname(file.relativePath),
        fullName: file.relativePath
      };
    });

    const usagePlaces = await inquirer.prompt({
      type: 'list',
      name: 'whereUsed',
      message: `Page or component that will be using this ${type}`,
      choices: filteredChoices.map((choiceObject) => {
        return choiceObject.prettyName;
      })
    });

    const chosenPath = fileChoices.find((file): boolean => {
      return path.dirname(file.relativePath) === usagePlaces.whereUsed;
    });

    return chosenPath.absolutePath;
  } else {
    return context.appNgModulePath;
  }
}

export async function tabsPrompt(appScripts: typeof AppScripts) {
  const tabNames = [];

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
