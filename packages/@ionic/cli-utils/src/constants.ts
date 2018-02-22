import { ProjectType } from './definitions';

export const PROJECT_FILE = 'ionic.config.json';
export const PROJECT_FILE_LEGACY = 'ionic.project';
export const PROJECT_TYPES: ProjectType[] = ['angular', 'ionic-angular', 'ionic1', 'custom'];

export enum CommandGroup {
  Deprecated,
  Hidden,
}

export enum NamespaceGroup {
  Deprecated,
  Hidden,
  Beta,
}

export enum OptionGroup {
  Advanced,
  AppScripts,
  Cordova,
  Deprecated,
  Hidden,
}
