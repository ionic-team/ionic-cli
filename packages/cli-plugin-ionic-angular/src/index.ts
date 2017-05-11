import * as chalk from 'chalk';
import * as path from 'path';

import { IonicEnvironment, IHookEngine, readPackageJsonFile, prettyPath } from '@ionic/cli-utils';

import { build } from './build';
import { generate } from './generate';
import { serve } from './serve';

export const name = '__NAME__';
export const version = '__VERSION__';

async function getIonicAngularVersion(env: IonicEnvironment): Promise<string | undefined> {
  const ionicAngularPackageJsonFilePath = path.resolve(env.project.directory, 'node_modules', 'ionic-angular', 'package.json'); // TODO

  try {
    const ionicAngularPackageJson = await readPackageJsonFile(ionicAngularPackageJsonFilePath);
    return ionicAngularPackageJson.version;
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(ionicAngularPackageJsonFilePath))} file: ${e}`);
  }
}

async function getAppScriptsVersion(env: IonicEnvironment): Promise<string | undefined> {
  const appScriptsPackageJsonFilePath = path.resolve(env.project.directory, 'node_modules', '@ionic', 'app-scripts', 'package.json'); // TODO

  try {
    const appScriptsPackageJson = await readPackageJsonFile(appScriptsPackageJsonFilePath);
    return appScriptsPackageJson.version;
  } catch (e) {
    env.log.error(`Error with ${chalk.bold(prettyPath(appScriptsPackageJsonFilePath))} file: ${e}`);
  }
}

export function registerHooks(hooks: IHookEngine) {
  hooks.register(name, 'command:docs', async ({ env }) => {
    const docsHomepage = 'https://ionicframework.com/docs';

    if (!env.project.directory) {
      return docsHomepage;
    }

    const ionicAngularVersion = await getIonicAngularVersion(env);
    const url = `${docsHomepage}/${ionicAngularVersion ? ionicAngularVersion + '/' : ''}api`;

    return url;
  });

  hooks.register(name, 'command:generate', async (args) => {
    await generate(args);
  });

  hooks.register(name, 'command:info', async ({ env }) => {
    if (!env.project.directory) {
      return [];
    }

    const [ionicAngularVersion, appScriptsVersion] = await Promise.all([getIonicAngularVersion(env), getAppScriptsVersion(env)]);

    return [
      { type: 'local-packages', name: 'Ionic Framework', version: ionicAngularVersion ? `ionic-angular ${ionicAngularVersion}` : 'not installed' },
      { type: 'local-packages', name, version },
      { type: 'local-packages', name: '@ionic/app-scripts', version: appScriptsVersion ? appScriptsVersion : 'not installed' },
    ];
  });

  hooks.register(name, 'command:serve', async (args) => {
    return serve(args);
  });

  hooks.register(name, 'command:build', async (args) => {
    await build(args);
  });
}
