import * as path from 'path';

import { ICLIEventEmitter, readPackageJsonFile } from '@ionic/cli-utils';

import { build } from './build';
import { generate } from './generate';
import { serve } from './serve';

export const version = '__VERSION__';

export function registerEvents(emitter: ICLIEventEmitter) {
  emitter.on('docs', async () => {
    const appDirectory = '.'; // TODO: change this
    const ionicAngularPackageJson = await readPackageJsonFile(path.resolve(appDirectory, 'node_modules', 'ionic-angular', 'package.json')); // TODO
    const docsHomepage = 'https://ionicframework.com/docs';
    const version = ionicAngularPackageJson.version;
    const url = `${docsHomepage}/${version}/api`;

    return url;
  });

  emitter.on('generate', async (args) => {
    await generate(args);
  });

  emitter.on('info', async () => {
    const appDirectory = '.'; // TODO: change this
    const ionicAngularPackageJson = await readPackageJsonFile(path.resolve(appDirectory, 'node_modules', 'ionic-angular', 'package.json')); // TODO
    const appScriptsPackageJson = await readPackageJsonFile(path.resolve(appDirectory, 'node_modules', '@ionic', 'app-scripts', 'package.json')); // TODO

    return [
      ['Ionic Framework', `ionic-angular ${ionicAngularPackageJson.version}`],
      ['app-scripts', appScriptsPackageJson.version],
    ];
  });

  emitter.on('serve', async (args) => {
    return serve(args);
  });

  emitter.on('build', async (args) => {
    await build(args);
  });
}
