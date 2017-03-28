import * as AppScriptsType from '@ionic/app-scripts';
import * as inquirerType from 'inquirer';
import * as semverType from 'semver';

export function load(modulePath: '@ionic/app-scripts'): typeof AppScriptsType;
export function load(modulePath: 'inquirer'): typeof inquirerType;
export function load(modulePath: 'semver'): typeof semverType;
export function load(modulePath: string): any {
  return require(modulePath);
}
