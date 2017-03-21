import * as path from 'path';


async function getPages(appScripts: any, context: any) {
  const fileChoices: any[] = [];

  const pages = await appScripts.getNgModules(context, ['page', 'component']);

  pages.forEach((page: any) => {
    fileChoices.push({ fileName: path.basename(page.absolutePath, '.module.ts'), absolutePath: page.absolutePath, relativePath: path.relative(context.rootDir, page.absolutePath) });
  });

  return fileChoices;
}

export async function prompt(name: string, appScripts: any, context: any, inquirer: any) {
  const usageQuestion = await inquirer.prompt({
    type: 'confirm',
    name: 'usage',
    message: `Use this ${name} in more than one template?`
  });

  if (!usageQuestion.usage) {
    const filteredChoices: any = [];
    const fileChoices = await getPages(appScripts, context);

    fileChoices.forEach((file: any) => {
      filteredChoices.push({ prettyName: path.dirname(file.relativePath), fullName: file.relativePath });
    });

    const usagePlaces = await inquirer.prompt({
      type: 'list',
      name: 'whereUsed',
      message: `Page or component that will be using this ${name}`,
      choices: filteredChoices.map((choiceObject: any) => {
        return choiceObject.prettyName;
      })
    });

    const chosenPath = fileChoices.find((file: any): boolean => {
      return path.dirname(file.relativePath) === usagePlaces.whereUsed;
    });
    return chosenPath.absolutePath;
  } else {
    return context.appNgModulePath;
  }
}

export async function tabsPrompt(appScripts: any, context: any, inquirer: any) {
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
