import { getProjectInfo } from '@ionic/cli-utils';
import { loadPlugin } from './plugins';

export const PREFIX = '@ionic/cli-build-';

export default async function(projectDirectory: string): Promise<Function> {
  const projectJson = await getProjectInfo(projectDirectory);
  const buildPlugins = Object.keys(projectJson['dependencies'])
    .concat(Object.keys(projectJson['devDependencies']))
    .filter(pkgName => pkgName && pkgName.indexOf(PREFIX) === 0);

  const plugins = await Promise.all(
    buildPlugins.map(pkgName => {
      return loadPlugin(projectDirectory, pkgName, true);
    })
  );

  const pluginFns = plugins.map((plugin) => {
    return plugin.default(projectDirectory);
  });

  return async function(eventName: string, options: { [key: string]: any }): Promise<any> {
    let results = {};

    for (let pluginFn of pluginFns) {
      let pluginResult = await pluginFn(eventName, options);
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
