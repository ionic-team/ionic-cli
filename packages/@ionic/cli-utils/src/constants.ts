import * as path from 'path';

import { ProjectType } from './definitions';

export const ASSETS_DIRECTORY = path.resolve(__dirname, 'assets');

export const PROJECT_FILE = 'ionic.config.json';
export const PROJECT_TYPES: ProjectType[] = ['angular', 'ionic-angular', 'ionic1', 'custom'];

export enum CommandGroup {
  Deprecated,
  Hidden,
  Beta,
  Experimental,
}

export enum NamespaceGroup {
  Deprecated,
  Hidden,
  Beta,
  Experimental,
}

export enum OptionGroup {
  Advanced,
  AppScripts,
  Cordova,
  Deprecated,
  Hidden,
}
