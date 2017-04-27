import * as AppScriptsType from '@ionic/app-scripts';

export function load(modulePath: '@ionic/app-scripts'): typeof AppScriptsType;
export function load(modulePath: string): any {
  return require(modulePath);
}
