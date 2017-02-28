import { getProjectInfo } from '@ionic/cli-utils';
import { loadPlugin } from './plugins';

export const PREFIX = '@ionic/cli-build-';

export default async function(projectDirectory: string): Promise<Function> {
  const projectJson = await getProjectInfo(projectDirectory);
  const buildPlugins = Object.keys(projectJson['dependencies']).concat(projectJson['devDependencies'])
    .filter(pkgName => pkgName.startsWith(PREFIX));

  const plugins = await Promise.all(
    buildPlugins.map(pkgName => {
      return loadPlugin(projectDirectory, pkgName, true);
    })
  );

  return function(eventName: string, options: { [key: string]: any } ) {
    plugins.forEach(async function(plugin: any) {
      await plugin.default(eventName, options);
    });
  };
};
