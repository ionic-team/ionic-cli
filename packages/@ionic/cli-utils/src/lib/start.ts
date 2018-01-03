import * as path from 'path';

import chalk from 'chalk';

import {
  ERROR_FILE_INVALID_JSON,
  ERROR_FILE_NOT_FOUND,
  fsReadJsonFile,
  fsWriteJsonFile,
} from '@ionic/cli-framework/utils/fs';

import { IConfig, StarterList, StarterManifest, StarterTemplate } from '../definitions';
import { isStarterManifest } from '../guards';
import { createRequest } from './http';

export const STARTER_BASE_URL = 'https://d2ql0qc7j8u4b2.cloudfront.net';

export function isProjectNameValid(name: string): boolean {
  return name !== '.';
}

export function getHelloText(): string {
  return `
${chalk.bold('♬ ♫ ♬ ♫  Your Ionic app is ready to go! ♬ ♫ ♬ ♫')}

${chalk.bold('Run your app in the browser (great for initial development):')}
  ${chalk.green('ionic serve')}

${chalk.bold('Install the DevApp to easily test on iOS and Android')}
  ${chalk.green('https://bit.ly/ionic-dev-app')}

${chalk.bold('Run on a device or simulator:')}
  ${chalk.green('ionic cordova run ios')}

${chalk.bold('Test and share your app on a device with the Ionic View app:')}
  https://ionicframework.com/products/view
  `;
}

export async function readStarterManifest(p: string): Promise<StarterManifest> {
  try {
    const manifest = await fsReadJsonFile(p);

    if (!isStarterManifest(manifest)) {
      throw new Error(`${p} is not a valid starter manifest.`);
    }

    return manifest;
  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`${p} not found`);
    } else if (e === ERROR_FILE_INVALID_JSON) {
      throw new Error(`${p} is not valid JSON.`);
    }

    throw e;
  }
}

export async function updatePackageJsonForCli(projectRoot: string, appName: string): Promise<void> {
  const filePath = path.resolve(projectRoot, 'package.json');

  try {
    const jsonStructure = await fsReadJsonFile(filePath);

    jsonStructure['name'] = appName;
    jsonStructure['version'] = '0.0.1';
    jsonStructure['description'] = 'An Ionic project';

    await fsWriteJsonFile(filePath, jsonStructure, { encoding: 'utf8' });

  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`${filePath} not found`);
    } else if (e === ERROR_FILE_INVALID_JSON) {
      throw new Error(`${filePath} is not valid JSON.`);
    }
    throw e;
  }
}

export async function getStarterList(config: IConfig, tag = 'latest'): Promise<StarterList> {
  const { req } = await createRequest(config, 'get', `${STARTER_BASE_URL}/${tag === 'latest' ? '' : `${tag}/`}starters.json`);

  const res = await req;

  // TODO: typecheck

  return res.body;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'blank',
    type: 'angular',
    description: 'A blank starter project',
    id: 'angular-official-blank',
  },
  {
    name: 'tabs',
    type: 'ionic-angular',
    description: 'A starting project with a simple tabbed interface',
    id: 'ionic-angular-official-tabs',
  },
  {
    name: 'blank',
    type: 'ionic-angular',
    description: 'A blank starter project',
    id: 'ionic-angular-official-blank',
  },
  {
    name: 'sidemenu',
    type: 'ionic-angular',
    description: 'A starting project with a side menu with navigation in the content area',
    id: 'ionic-angular-official-sidemenu',
  },
  {
    name: 'super',
    type: 'ionic-angular',
    description: 'A starting project complete with pre-built pages, providers and best practices for Ionic development.',
    id: 'ionic-angular-official-super',
  },
  {
    name: 'tutorial',
    type: 'ionic-angular',
    description: 'A tutorial based project that goes along with the Ionic documentation',
    id: 'ionic-angular-official-tutorial',
  },
  {
    name: 'aws',
    type: 'ionic-angular',
    description: 'AWS Mobile Hub Starter',
    id: 'ionic-angular-official-aws',
  },
  {
    name: 'tabs',
    type: 'ionic1',
    description: 'A starting project for Ionic using a simple tabbed interface',
    id: 'ionic1-official-tabs',
  },
  {
    name: 'blank',
    type: 'ionic1',
    description: 'A blank starter project for Ionic',
    id: 'ionic1-official-blank',
  },
  {
    name: 'sidemenu',
    type: 'ionic1',
    description: 'A starting project for Ionic using a side menu with navigation in the content area',
    id: 'ionic1-official-sidemenu',
  },
  {
    name: 'maps',
    type: 'ionic1',
    description: 'An Ionic starter project using Google Maps and a side menu',
    id: 'ionic1-official-maps',
  },
];
