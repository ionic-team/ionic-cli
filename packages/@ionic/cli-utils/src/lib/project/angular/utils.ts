import * as path from 'path';

import * as Debug from 'debug';
import { fsReadJsonFile, fsWriteFile } from '@ionic/cli-framework/utils/fs';

import { AngularConfig, IProject } from '../../../definitions';
import { isAngularConfig } from '../../../guards';
import { addCordovaEngine, removeCordovaEngine } from '../../integrations/cordova/utils';

const debug = Debug('ionic:cli-utils:lib:project:angular:utils');

export const ANGULAR_CONFIG_FILE = '.angular-cli.json';
export const ERROR_INVALID_ANGULAR_CLI_JSON = 'INVALID_ANGULAR_CLI_JSON';

export async function readAngularConfigFile(p: string): Promise<AngularConfig> {
  const angularJson = await fsReadJsonFile(p);

  if (!isAngularConfig(angularJson)) {
    throw ERROR_INVALID_ANGULAR_CLI_JSON;
  }

  return angularJson;
}

export async function addCordovaEngineForAngular(project: IProject, platform: string): Promise<void> {
  debug('Adding Cordova engine for platform: %s', platform);
  const srcDir = await project.getSourceDir();
  const platformWWW = path.resolve(project.directory, 'platforms', platform, 'platform_www');
  const angularJsonPath = path.resolve(project.directory, ANGULAR_CONFIG_FILE);
  const angularJson = await readAngularConfigFile(angularJsonPath);
  const app = angularJson.apps[0];
  const cordovaAssets = { glob: '**/*', input: platformWWW, output: './' };
  app.assets.push(cordovaAssets);
  debug('Adding Cordova assets to %s: %o', ANGULAR_CONFIG_FILE, cordovaAssets);
  await fsWriteFile(angularJsonPath, JSON.stringify(angularJson, undefined, 2) + '\n', { encoding: 'utf8' });
  debug('Inserting Cordova HTML within %s', srcDir);
  await addCordovaEngine(srcDir);
}

export async function removeCordovaEngineForAngular(project: IProject, platform: string): Promise<void> {
  debug('Removing Cordova engine for platform: %s', platform);
  const angularJsonPath = path.resolve(project.directory, ANGULAR_CONFIG_FILE);
  const angularJson = await readAngularConfigFile(angularJsonPath);
  const app = angularJson.apps[0];
  app.assets = app.assets.filter((asset: any) => !asset.input || !asset.input.endsWith('platform_www'));
  await fsWriteFile(angularJsonPath, JSON.stringify(angularJson, undefined, 2) + '\n', { encoding: 'utf8' });
  await removeCordovaEngine(await project.getSourceDir());
}
