import chalk from 'chalk';

import {
  ERROR_FILE_INVALID_JSON,
  ERROR_FILE_NOT_FOUND,
  fsReadJsonFile,
} from '@ionic/cli-framework/utils/fs';

import { IConfig, StarterList, StarterManifest, StarterTemplate } from '../definitions';
import { isStarterManifest } from '../guards';
import { emoji } from './utils/emoji';
import { createRequest } from './http';

export const STARTER_BASE_URL = 'https://d2ql0qc7j8u4b2.cloudfront.net';

export function isProjectNameValid(name: string): boolean {
  return name !== '.';
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

const advertisementSeparator = '─';

export async function getIonicDevAppText() {
  const msg = `
     ${chalk.bold(`${emoji('✨', '*')}   IONIC  DEVAPP   ${emoji('✨', '*')}`)}\n
 Speed up development with the ${chalk.bold('Ionic DevApp')}, our fast, on-device testing mobile app\n
  -  ${emoji('🔑', '')}   Test on iOS and Android without Native SDKs
  -  ${emoji('🚀', '')}   LiveReload for instant style and JS updates\n
 -->    Install DevApp: ${chalk.bold('https://bit.ly/ionic-dev-app')}    <--
`;

  return `${msg}\n${advertisementSeparator.repeat(60)}\n\n`;
}

export async function getIonicProText() {
  const msg = `
     ${chalk.bold(`${emoji('🔥', '*')}   IONIC  PRO   ${emoji('🔥', '*')}`)}\n
 Supercharge your Ionic development with the ${chalk.bold('Ionic Pro')} SDK\n
  -  ${emoji('⚠️', '')}   Track runtime errors in real-time, back to your original TypeScript
  -  ${emoji('📲', '')}  Push remote updates and skip the app store queue\n
 Learn more about Ionic Pro: ${chalk.bold('https://ionicframework.com/pro')}
`;

  return `${msg}\n${advertisementSeparator.repeat(60)}\n\n`;
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
