import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import { fsReadJsonFile, fsWriteFile } from '@ionic/cli-framework/utils/fs';

import { AngularConfig, IProject } from '../../../definitions';
import { isAngularConfig } from '../../../guards';
import { FatalException } from '../../errors';
import { addCordovaEngine, removeCordovaEngine } from '../../integrations/cordova/utils';

const debug = Debug('ionic:cli-utils:lib:project:angular:utils');

export const ANGULAR_CONFIG_FILE = 'angular.json';
export const ERROR_INVALID_ANGULAR_CLI_JSON = 'INVALID_ANGULAR_CLI_JSON';

export async function readAngularConfigFile(p: string): Promise<AngularConfig> {
  const angularJson = await fsReadJsonFile(p);

  if (!isAngularConfig(angularJson)) {
    throw ERROR_INVALID_ANGULAR_CLI_JSON;
  }

  return angularJson;
}

export async function addCordovaEngineForAngular(project: IProject, platform: string, appName?: string): Promise<void> {
  debug('Adding Cordova engine for platform: %s', platform);
  const platformWWW = path.resolve(project.directory, 'platforms', platform, 'platform_www');
  const angularJsonPath = path.resolve(project.directory, ANGULAR_CONFIG_FILE);
  const angularJson = await readAngularConfigFile(angularJsonPath);
  const angularApp = angularJson.projects[appName || angularJson.defaultProject];

  if (!angularApp) {
    throw new FatalException(`${chalk.bold(`projects.${appName || angularJson.defaultProject}`)} key in ${chalk.bold(ANGULAR_CONFIG_FILE)} is undefined--cannot add assets.`);
  }

  const srcDir = await project.getSourceDir(angularApp.sourceRoot || path.resolve(angularApp.root, 'src'));
  const buildOptions = angularApp.architect.build.options;

  const cordovaAssets = { glob: '**/*', input: platformWWW, output: './' };
  buildOptions.assets.push(cordovaAssets);
  debug('Adding Cordova assets to %s: %o', ANGULAR_CONFIG_FILE, cordovaAssets);
  await fsWriteFile(angularJsonPath, JSON.stringify(angularJson, undefined, 2) + '\n', { encoding: 'utf8' });
  debug('Inserting Cordova HTML within %s', srcDir);
  await addCordovaEngine(srcDir);
}

export async function removeCordovaEngineForAngular(project: IProject, platform: string, appName?: string): Promise<void> {
  debug('Removing Cordova engine for platform: %s', platform);
  const angularJsonPath = path.resolve(project.directory, ANGULAR_CONFIG_FILE);
  const angularJson = await readAngularConfigFile(angularJsonPath);
  const angularApp = angularJson.projects[appName || angularJson.defaultProject];

  if (!angularApp) {
    throw new FatalException(`${chalk.bold(`projects.${appName || angularJson.defaultProject}`)} key in ${chalk.bold(ANGULAR_CONFIG_FILE)} is undefined--cannot remove assets.`);
  }

  const srcDir = await project.getSourceDir(angularApp.sourceRoot || path.resolve(angularApp.root, 'src'));
  const buildOptions = angularApp.architect.build.options;

  buildOptions.assets = buildOptions.assets.filter((asset: any) => !asset.input || !asset.input.endsWith('platform_www'));
  await fsWriteFile(angularJsonPath, JSON.stringify(angularJson, undefined, 2) + '\n', { encoding: 'utf8' });
  await removeCordovaEngine(srcDir);
}
