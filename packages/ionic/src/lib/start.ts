import { columnar } from '@ionic/cli-framework/utils/format';
import { readJson } from '@ionic/utils-fs';
import * as lodash from 'lodash';

import { CommandLineOptions, IConfig, ILogger, ProjectType, StarterList, StarterManifest, StarterTemplate } from '../definitions';
import { isStarterManifest } from '../guards';

import { input, strong, title } from './color';
import { FatalException } from './errors';
import { emoji } from './utils/emoji';
import { createRequest } from './utils/http';

export const STARTER_BASE_URL = 'https://d2ql0qc7j8u4b2.cloudfront.net';

export interface BaseAppSchema {
  projectId: string;
  projectDir: string;
  packageId?: string;
  appflowId?: string;
}

export interface NewAppSchema extends BaseAppSchema {
  cloned: false;
  name: string;
  type: ProjectType;
  template: string;
}

export interface ClonedAppSchema extends BaseAppSchema {
  cloned: true;
  url: string;
}

export type AppSchema = NewAppSchema | ClonedAppSchema;

export function verifyOptions(options: CommandLineOptions, { log }: { log: ILogger; }): void {
  // If the action is list then lets just end here.
  if (options['list']) {
    const headers = ['name', 'project type', 'description'];
    log.rawmsg(columnar(STARTER_TEMPLATES.map(({ name, type, description }) => [input(name), strong(type), description || '']), { headers }));
    throw new FatalException('', 0);
  }

  if (options['skip-deps']) {
    log.warn(`The ${input('--skip-deps')} option has been deprecated. Please use ${input('--no-deps')}.`);
    options['deps'] = false;
  }

  if (options['skip-link']) {
    log.warn(`The ${input('--skip-link')} option has been deprecated. Please use ${input('--no-link')}.`);
    options['link'] = false;
  }

  if (options['pro-id']) {
    log.warn(`The ${input('--pro-id')} option has been deprecated. Please use ${input('--id')}.`);
    options['id'] = options['pro-id'];
  }

  if (options['id']) {
    if (!options['link']) {
      log.warn(`The ${input('--no-link')} option has no effect with ${input('--id')}. App must be linked.`);
    }

    options['link'] = true;

    if (!options['git']) {
      log.warn(`The ${input('--no-git')} option has no effect with ${input('--id')}. Git must be used.`);
    }

    options['git'] = true;
  }
}

export async function readStarterManifest(p: string): Promise<StarterManifest> {
  try {
    const manifest = await readJson(p);

    if (!isStarterManifest(manifest)) {
      throw new Error(`${p} is not a valid starter manifest.`);
    }

    return manifest;
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(`${p} not found`);
    } else if (e instanceof SyntaxError) {
      throw new Error(`${p} is not valid JSON.`);
    }

    throw e;
  }
}

export function getAdvertisement(): string {
  const choices = [getAppflowAdvertisement, getAdvisoryAdvertisement, getEnterpriseAdvertisement];
  const idx = Math.floor(Math.random() * choices.length);

  return `${choices[idx]()}\n\n`;
}

function getAppflowAdvertisement(): string {
  return `
  ──────────────────────────────────────────────────────────────

        ${title('Ionic Appflow')}, the mobile DevOps solution by Ionic

           Continuously build, deploy, and ship apps ${emoji('🚀', ' ')}
        Focus on building apps while we automate the rest ${emoji('🎁', ' ')}

        ${emoji('         👉 ', 'Learn more:')} ${strong('https://ion.link/appflow')} ${emoji(' 👈', '')}

  ──────────────────────────────────────────────────────────────
`;
}

function getAdvisoryAdvertisement(): string {
  return `
  ──────────────────────────────────────────────────────────────────────────────

         ${title('Ionic Advisory')}, tailored solutions and expert services by Ionic

                             Go to market faster ${emoji('🏆', ' ')}
                    Real-time troubleshooting and guidance ${emoji('💁', ' ')}
        Custom training, best practices, code and architecture reviews ${emoji('🔎', ' ')}
      Customized strategies for every phase of the development lifecycle ${emoji('🔮', ' ')}

               ${emoji('         👉 ', 'Learn more:')} ${strong('https://ion.link/advisory')} ${emoji(' 👈', '')}

  ──────────────────────────────────────────────────────────────────────────────
`;
}

function getEnterpriseAdvertisement(): string {
  return `
  ──────────────────────────────────────────────────────────────────────

      ${title('Ionic Enterprise')}, platform and solutions for teams by Ionic

                  Powerful library of native APIs ${emoji('⚡️', '')}
                 A supercharged platform for teams ${emoji('💪', '')}
       Bring your company's designs to life with Design Systems ${emoji('🎨', '')}

         ${emoji('         👉 ', 'Learn more:')} ${strong('https://ion.link/enterprise')} ${emoji(' 👈', '')}

  ──────────────────────────────────────────────────────────────────────
`;
}

export async function getStarterList(config: IConfig, tag = 'latest'): Promise<StarterList> {
  const { req } = await createRequest('GET', `${STARTER_BASE_URL}/${tag === 'latest' ? '' : `${tag}/`}starters.json`, config.getHTTPConfig());

  const res = await req;

  // TODO: typecheck

  return res.body;
}

export function getStarterProjectTypes(): string[] {
  return lodash.uniq(STARTER_TEMPLATES.map(t => t.type));
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'blank',
    type: 'angular',
    description: 'A blank starter project',
    id: 'angular-official-blank',
  },
  {
    name: 'sidemenu',
    type: 'angular',
    description: 'A starting project with a side menu with navigation in the content area',
    id: 'angular-official-sidemenu',
  },
  {
    name: 'tabs',
    type: 'angular',
    description: 'A starting project with a simple tabbed interface',
    id: 'angular-official-tabs',
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
