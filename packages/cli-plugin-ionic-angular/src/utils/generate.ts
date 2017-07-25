import * as path from 'path';

import { IonicEnvironment, validators } from '@ionic/cli-utils';

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

export async function getModules(context: AppScriptsType.BuildContext, kind: string) {
  switch (kind) {
    case 'component':
      return context.componentsNgModulePath || context.appNgModulePath;
    case 'pipe':
      return context.pipesNgModulePath || context.appNgModulePath;
    case 'directive':
      return context.directivesNgModulePath || context.appNgModulePath;
  }
}

export async function tabsPrompt(env: IonicEnvironment) {
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
