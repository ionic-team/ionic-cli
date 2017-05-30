
import {
  StarterTemplate,
  StarterTemplateType
} from '../definitions';

export const STARTER_TYPES: StarterTemplateType[] = [
  {
    id: 'ionic-angular',
    name: 'v2',
    baseArchive: 'https://github.com/ionic-team/ionic2-app-base/archive/<BRANCH_NAME>.tar.gz',
    globalDependencies: [],
    localDependencies: ['@ionic/cli-plugin-ionic-angular'],
  },
  {
    id: 'ionic1',
    name: 'v1',
    baseArchive: 'https://github.com/ionic-team/ionic-app-base/archive/<BRANCH_NAME>.tar.gz',
    globalDependencies: [],
    localDependencies: ['@ionic/cli-plugin-ionic1'],
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tabs',
    type: 'ionic-angular',
    description: 'A starting project with a simple tabbed interface',
    path: 'ionic-team/ionic2-starter-tabs',
    archive: 'https://github.com/ionic-team/ionic2-starter-tabs/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'blank',
    type: 'ionic-angular',
    description: 'A blank starter project',
    path: 'ionic-team/ionic2-starter-blank',
    archive: 'https://github.com/ionic-team/ionic2-starter-blank/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'sidemenu',
    type: 'ionic-angular',
    description: 'A starting project with a side menu with navigation in the content area',
    path: 'ionic-team/ionic2-starter-sidemenu',
    archive: 'https://github.com/ionic-team/ionic2-starter-sidemenu/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'super',
    type: 'ionic-angular',
    description: 'A starting project complete with pre-built pages, providers and best practices for Ionic development.',
    path: 'ionic-team/ionic-starter-super',
    archive: 'https://github.com/ionic-team/ionic-starter-super/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'conference',
    type: 'ionic-angular',
    description: 'A project that demonstrates a realworld application',
    path: 'ionic-team/ionic-conference-app',
    archive: 'https://github.com/ionic-team/ionic-conference-app/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'tutorial',
    type: 'ionic-angular',
    description: 'A tutorial based project that goes along with the Ionic documentation',
    path: 'ionic-team/ionic2-starter-tutorial',
    archive: 'https://github.com/ionic-team/ionic2-starter-tutorial/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'aws',
    type: 'ionic-angular',
    description: 'AWS Mobile Hub Starter',
    path: 'ionic-team/ionic2-starter-aws',
    archive: 'https://github.com/ionic-team/ionic2-starter-aws/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'tabs',
    type: 'ionic1',
    description: 'A starting project for Ionic using a simple tabbed interface',
    path: 'ionic-team/ionic-starter-tabs',
    archive: 'https://github.com/ionic-team/ionic-starter-tabs/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'blank',
    type: 'ionic1',
    description: 'A blank starter project for Ionic',
    path: 'ionic-team/ionic-starter-blank',
    archive: 'https://github.com/ionic-team/ionic-starter-blank/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'sidemenu',
    type: 'ionic1',
    description: 'A starting project for Ionic using a side menu with navigation in the content area',
    path: 'ionic-team/ionic-starter-sidemenu',
    archive: 'https://github.com/ionic-team/ionic-starter-sidemenu/archive/<BRANCH_NAME>.tar.gz'
  },
  // {
  //   name: 'complex-list',
  //   type: 'ionic1',
  //   description: 'A complex list starter template',
  //   path: 'ionic-team/ionic-starter-maps',
  //   archive: 'https://github.com/ionic-team/ionic-starter-complex-list/archive/<BRANCH_NAME>.tar.gz'
  // },
  {
    name: 'maps',
    type: 'ionic1',
    description: 'An Ionic starter project using Google Maps and a side menu',
    path: 'ionic-team/ionic-starter-maps',
    archive: 'https://github.com/ionic-team/ionic-starter-maps/archive/<BRANCH_NAME>.tar.gz'
  },
];
