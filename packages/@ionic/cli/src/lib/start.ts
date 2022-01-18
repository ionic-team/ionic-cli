import { readJson } from '@ionic/utils-fs';
import { columnar } from '@ionic/utils-terminal';
import * as lodash from 'lodash';

import { COLUMNAR_OPTIONS, PROJECT_TYPES } from '../constants';
import { CommandLineOptions, IConfig, ILogger, ProjectType, StarterList, StarterManifest, StarterTemplate } from '../definitions';
import { isStarterManifest } from '../guards';

import { input, strong, title } from './color';
import { FatalException } from './errors';
import { prettyProjectName } from './project';
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
  themeColor?: string;
  appIcon?: Buffer;
  splash?: Buffer;
}

export interface ClonedAppSchema extends BaseAppSchema {
  cloned: true;
  url: string;
}

export type AppSchema = NewAppSchema | ClonedAppSchema;

export function verifyOptions(options: CommandLineOptions, { log }: { log: ILogger; }): void {
  // If the action is list then lets just end here.
  if (options['list']) {
    const typeOption = options['type'] ? String(options['type']) : undefined;

    if (typeOption && !PROJECT_TYPES.includes(typeOption as ProjectType)) {
      throw new FatalException(
        `${input(typeOption)} is not a valid project type.\n` +
        `Valid project types are: ${getStarterProjectTypes().map(type => input(type)).join(', ')}`
      );
    }

    const headers = ['name', 'description'].map(h => strong(h));
    const starterTypes = typeOption ? [typeOption] : getStarterProjectTypes();

    for (const starterType of starterTypes) {
      const starters = STARTER_TEMPLATES.filter(template => template.projectType === starterType);

      log.rawmsg(`\n${strong(`Starters for ${prettyProjectName(starterType)}`)} (${input(`--type=${starterType}`)})\n\n`);
      log.rawmsg(columnar(starters.map(({ name, description }) => [input(name), description || '']), { ...COLUMNAR_OPTIONS, headers }));
      log.rawmsg('\n');
    }

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
    if (options['link'] === false) {
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

           Continuously build, deploy, and ship apps ${emoji('🚀', '')}
        Focus on building apps while we automate the rest ${emoji('🎁', '')}

        ${emoji('         👉 ', 'Learn more:')} ${strong('https://ion.link/appflow')} ${emoji(' 👈', '')}

  ──────────────────────────────────────────────────────────────
`;
}

function getAdvisoryAdvertisement(): string {
  return `
  ──────────────────────────────────────────────────────────────────────────────

         ${title('Ionic Advisory')}, tailored solutions and expert services by Ionic

                             Go to market faster ${emoji('🏆', '')}
                    Real-time troubleshooting and guidance ${emoji('💁', '')}
        Custom training, best practices, code and architecture reviews ${emoji('🔎', '')}
      Customized strategies for every phase of the development lifecycle ${emoji('🔮', '')}

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
  return lodash.uniq(STARTER_TEMPLATES.map(t => t.projectType));
}

export interface SupportedFramework {
  name: string;
  type: ProjectType;
  description: string;
}

export const SUPPORTED_FRAMEWORKS: readonly SupportedFramework[] = [
  {
    name: 'Angular',
    type: 'angular',
    description: 'https://angular.io',
  },
  {
    name: 'React',
    type: 'react',
    description: 'https://reactjs.org',
  },
  {
    name: 'Vue',
    type: 'vue',
    description: 'https://vuejs.org',
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  // Vue
  {
    name: 'tabs',
    projectType: 'vue',
    type: 'managed',
    description: 'A starting project with a simple tabbed interface',
    id: 'vue-official-tabs',
  },
  {
    name: 'sidemenu',
    projectType: 'vue',
    type: 'managed',
    description: 'A starting project with a side menu with navigation in the content area',
    id: 'vue-official-sidemenu',
  },
  {
    name: 'blank',
    projectType: 'vue',
    type: 'managed',
    description: 'A blank starter project',
    id: 'vue-official-blank',
  },
  {
    name: 'list',
    projectType: 'vue',
    type: 'managed',
    description: 'A starting project with a list',
    id: 'vue-official-list',
  },
  // Angular
  {
    name: 'tabs',
    projectType: 'angular',
    type: 'managed',
    description: 'A starting project with a simple tabbed interface',
    id: 'angular-official-tabs',
  },
  {
    name: 'sidemenu',
    projectType: 'angular',
    type: 'managed',
    description: 'A starting project with a side menu with navigation in the content area',
    id: 'angular-official-sidemenu',
  },
  {
    name: 'blank',
    projectType: 'angular',
    type: 'managed',
    description: 'A blank starter project',
    id: 'angular-official-blank',
  },
  {
    name: 'list',
    projectType: 'angular',
    type: 'managed',
    description: 'A starting project with a list',
    id: 'angular-official-list',
  },
  {
    name: 'my-first-app',
    projectType: 'angular',
    type: 'repo',
    description: 'A template for the "Build Your First App" tutorial',
    repo: 'https://github.com/ionic-team/photo-gallery-capacitor-ng',
  },
  // React
  {
    name: 'blank',
    projectType: 'react',
    type: 'managed',
    description: 'A blank starter project',
    id: 'react-official-blank',
  },
  {
    name: 'list',
    projectType: 'react',
    type: 'managed',
    description: 'A starting project with a list',
    id: 'react-official-list',
  },
  {
    name: 'my-first-app',
    projectType: 'react',
    type: 'repo',
    description: 'A template for the "Build Your First App" tutorial',
    repo: 'https://github.com/ionic-team/photo-gallery-capacitor-react',
  },
  {
    name: 'sidemenu',
    projectType: 'react',
    type: 'managed',
    description: 'A starting project with a side menu with navigation in the content area',
    id: 'react-official-sidemenu',
  },
  {
    name: 'tabs',
    projectType: 'react',
    type: 'managed',
    description: 'A starting project with a simple tabbed interface',
    id: 'react-official-tabs',
  },
  // Old Ionic V3
  {
    name: 'tabs',
    projectType: 'ionic-angular',
    type: 'managed',
    description: 'A starting project with a simple tabbed interface',
    id: 'ionic-angular-official-tabs',
  },
  {
    name: 'sidemenu',
    projectType: 'ionic-angular',
    type: 'managed',
    description: 'A starting project with a side menu with navigation in the content area',
    id: 'ionic-angular-official-sidemenu',
  },
  {
    name: 'blank',
    projectType: 'ionic-angular',
    type: 'managed',
    description: 'A blank starter project',
    id: 'ionic-angular-official-blank',
  },
  {
    name: 'super',
    projectType: 'ionic-angular',
    type: 'managed',
    description: 'A starting project complete with pre-built pages, providers and best practices for Ionic development.',
    id: 'ionic-angular-official-super',
  },
  {
    name: 'tutorial',
    projectType: 'ionic-angular',
    type: 'managed',
    description: 'A tutorial based project that goes along with the Ionic documentation',
    id: 'ionic-angular-official-tutorial',
  },
  {
    name: 'aws',
    projectType: 'ionic-angular',
    type: 'managed',
    description: 'AWS Mobile Hub Starter',
    id: 'ionic-angular-official-aws',
  },
  // Older Ionic V1
  {
    name: 'tabs',
    projectType: 'ionic1',
    type: 'managed',
    description: 'A starting project for Ionic using a simple tabbed interface',
    id: 'ionic1-official-tabs',
  },
  {
    name: 'sidemenu',
    projectType: 'ionic1',
    type: 'managed',
    description: 'A starting project for Ionic using a side menu with navigation in the content area',
    id: 'ionic1-official-sidemenu',
  },
  {
    name: 'blank',
    projectType: 'ionic1',
    type: 'managed',
    description: 'A blank starter project for Ionic',
    id: 'ionic1-official-blank',
  },
  {
    name: 'maps',
    projectType: 'ionic1',
    type: 'managed',
    description: 'An Ionic starter project using Google Maps and a side menu',
    id: 'ionic1-official-maps',
  },
];
