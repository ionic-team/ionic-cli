import * as path from 'path';
import {
  EmitEventFn,
  EventEnvironment,
  fsReadDir
} from '@ionic/cli-utils';
import { loadPlugin } from './plugins';

export const PREFIX = 'cli-build-';

export default async function createEmitEvent(environment: EventEnvironment): Promise<EmitEventFn> {

  // If not in a project then we will not emit any events
  if (!environment.project.directory) {
    return async (eventName: string): Promise<any> => {};
  }

  const mPath = path.join(environment.project.directory, 'node_modules', '@ionic');
  const ionicModules = await fsReadDir(mPath);

  const buildPlugins = ionicModules
    .filter(pkgName => pkgName && pkgName.indexOf(PREFIX) === 0)
    .map(pkgName => `@ionic/${pkgName}`);

  const plugins = await Promise.all(
    buildPlugins.map(pkgName => {
      return loadPlugin(environment.project.directory, pkgName, true);
    })
  );

  const pluginFns = plugins.map((plugin) => {
    return plugin.default(environment);
  });

  return async (eventName: string, options: { [key: string]: any }): Promise<any> => {
    let results = {};

    for (let pluginFn of pluginFns) {
      const pluginResult = await pluginFn(eventName, options);
      if (pluginResult) {
        results = {
          ...results,
          ...pluginResult
        };
      }
    }

    return results;
  };
};
