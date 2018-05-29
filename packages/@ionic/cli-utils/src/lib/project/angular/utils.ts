import * as path from 'path';

import chalk from 'chalk';
import * as Debug from 'debug';
import { fsReadJsonFile, fsWriteFile } from '@ionic/cli-framework/utils/fs';

import { AngularConfig, IProject } from '../../../definitions';
import { isAngularConfig } from '../../../guards';
import { FatalException } from '../../errors';
import { cloneDeep, isArray, isPlainObject, mapValues, mergeWith } from 'lodash';

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

export function replaceBrowserTarget(config: {}, source: string, target: string): any {
  function recurse(value: any): any {
    if (isPlainObject(value)) {
      mapValues(value, recurse);
    }

    if (value['browserTarget']) {
      value['browserTarget'] = value['browserTarget'].replace(new RegExp(`^${source}:`), `${target}:`);
    }
  }

  return mapValues(config, recurse);
}

export function extendAngularConfig(config: AngularConfig, source: string, target: string, buildOptions: any): AngularConfig {
  if (config.projects[source]) {
    const app = config.projects[target] = cloneDeep(config.projects[source]);

    if (app) {
      mergeWith(app.architect.build.options, buildOptions, (objValue, srcValue) => {
        if (isArray(objValue)) {
          return objValue.concat(srcValue);
        }
      });

      replaceBrowserTarget(app.architect, source, target);
    }
  } else {
    throw new FatalException(`${chalk.bold(`projects.${source}`)} key in ${chalk.bold(ANGULAR_CONFIG_FILE)} is undefined--cannot add assets.`);
  }

  return config;
}

export async function addCordovaEngineForAngular(project: IProject, platform: string, appName?: string): Promise<void> {
  debug('Adding Cordova engine for platform: %s', platform);
  const platformWWW = path.resolve(project.directory, 'platforms', platform, 'platform_www');
  const cordovaAssets = [{ glob: '**/*', input: platformWWW, output: './' }];
  const cordovaScripts = [{ input: path.resolve(platformWWW, 'cordova.js'), bundleName: 'cordova' }];
  const angularJsonPath = path.resolve(project.directory, ANGULAR_CONFIG_FILE);
  const angularJson = await readAngularConfigFile(angularJsonPath);
  const angularProject = appName || angularJson.defaultProject;
  const extendedProject = `ionic-cordova-platform-${platform}`;

  extendAngularConfig(angularJson, angularProject, extendedProject, {
    assets: cordovaAssets,
    scripts: cordovaScripts,
  });

  debug('Adding Cordova assets to %s: %o', ANGULAR_CONFIG_FILE, cordovaAssets);
  debug('Adding Cordova scripts to %s: %o', ANGULAR_CONFIG_FILE, cordovaScripts);

  await fsWriteFile(angularJsonPath, JSON.stringify(angularJson, undefined, 2) + '\n', { encoding: 'utf8' });
}

export async function removeCordovaEngineForAngular(project: IProject, platform: string): Promise<void> {
  debug('Removing Cordova engine for platform: %s', platform);
  const angularJsonPath = path.resolve(project.directory, ANGULAR_CONFIG_FILE);
  const angularJson = await readAngularConfigFile(angularJsonPath);
  const extendedProject = `ionic-cordova-platform-${platform}`;

  delete angularJson.projects[extendedProject];

  await fsWriteFile(angularJsonPath, JSON.stringify(angularJson, undefined, 2) + '\n', { encoding: 'utf8' });
}
