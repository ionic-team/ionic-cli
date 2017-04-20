import * as path from 'path';

import { IHookEngine, readPackageJsonFile } from '@ionic/cli-utils';

import { build } from './build';
import { generate } from './generate';
import { serve } from './serve';

export const name = '__NAME__';
export const version = '__VERSION__';

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:docs', async ({ env }) => {
    const docsHomepage = 'https://ionicframework.com/docs';

    if (!env.project.directory) {
      return docsHomepage;
    }

    const ionicAngularPackageJson = await readPackageJsonFile(path.resolve(env.project.directory, 'node_modules', 'ionic-angular', 'package.json')); // TODO
    const version = ionicAngularPackageJson.version;
    const url = `${docsHomepage}/${version}/api`;

    return url;
  });

  hooks.register(name, 'command:generate', async (args) => {
    await generate(args);
  });

  hooks.register(name, 'command:info', async ({ env }) => {
    if (!env.project.directory) {
      return [];
    }

    const [ ionicAngularPackageJson, appScriptsPackageJson ] = await Promise.all([
      readPackageJsonFile(path.resolve(env.project.directory, 'node_modules', 'ionic-angular', 'package.json')), // TODO
      readPackageJsonFile(path.resolve(env.project.directory, 'node_modules', '@ionic', 'app-scripts', 'package.json')), // TODO
    ]);

    return [
      { type: 'local-npm', name: 'Ionic Framework', version: `ionic-angular ${ionicAngularPackageJson.version}` },
      { type: 'local-npm', name, version },
      { type: 'local-npm', name: '@ionic/app-scripts', version: appScriptsPackageJson.version },
    ];
  });

  hooks.register(name, 'command:serve', async (args) => {
    return serve(args);
  });

  hooks.register(name, 'command:build', async (args) => {
    await build(args);
  });
}
