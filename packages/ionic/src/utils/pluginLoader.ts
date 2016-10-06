import { CommandExports } from '../ionic';

const availablePlugins = new Set<string>(['cloud']);

export const pluginPrefix = '@ionic/cli-plugin-';

export default function(name: string): CommandExports {
  return require(`${pluginPrefix}${name}`);
}

export function isPluginAvailable(name: string): boolean {
  return availablePlugins.has(name);
}
