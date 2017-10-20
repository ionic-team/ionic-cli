import { IonicEnvironment } from '../../definitions';

import { importAppScripts } from './app-scripts';

export async function generate(args: { env: IonicEnvironment; inputs: string[], options: { _: string[]; [key: string]: any; }; }): Promise<string[]> {
  const { minimistOptionsToArray } = await import('../utils/command');

  if (!args.env.project.directory) {
    return [];
  }

  const appScriptsArgs = minimistOptionsToArray(args.options, { useEquals: false, ignoreFalse: true, allowCamelCase: true });
  process.argv = ['node', 'appscripts'].concat(appScriptsArgs);

  const AppScripts = await importAppScripts(args.env);
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

async function promptQuestions(context: any) {
  return await prompt(context);
}

// async function getPages(context: any) {
//   const AppScripts = await import('@ionic/app-scripts');
//   const pages = await AppScripts.getNgModules(context, ['page', 'component']);
//   const ngModuleSuffix = await AppScripts.getStringPropertyValue('IONIC_NG_MODULE_FILENAME_SUFFIX');

//   return pages.map((page: any) => {
//     return {
//       fileName: path.basename(page.absolutePath, ngModuleSuffix),
//       absolutePath: page.absolutePath,
//       relativePath: path.relative(context.rootDir, page.absolutePath)
//     };
//   });
// }

async function prompt(context: any) {
  return context.appNgModulePath;
}

async function getModules(context: any, kind: string) {
  switch (kind) {
    case 'component':
      return context.componentsNgModulePath ? context.componentsNgModulePath : context.appNgModulePath;
    case 'pipe':
      return context.pipesNgModulePath ? context.pipesNgModulePath : context.appNgModulePath;
    case 'directive':
      return context.directivesNgModulePath ? context.directivesNgModulePath : context.appNgModulePath;
  }
}

export async function tabsPrompt(env: IonicEnvironment) {
  const { validators } = await import('@ionic/cli-framework/lib');

  const tabNames = [];

  const howMany = await env.prompt({
    type: 'input',
    name: 'howMany',
    message: 'How many tabs?',
    validate: v => validators.numeric(v),
  });

  for (let i = 0; i < parseInt(howMany, 10); i++) {
    const tabName = await env.prompt({
      type: 'input',
      name: 'tabName',
      message: 'Name of this tab:'
    });

    tabNames.push(tabName);
  }

  return tabNames;
}
