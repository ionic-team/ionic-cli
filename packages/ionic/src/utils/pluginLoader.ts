const availablePlugins = new Set<string>(['cloud']);

export const pluginPrefix = '@ionic/cli-plugin-';

export default function(name: string): Function {
  let plugin: any = require(`${pluginPrefix}${name}`);

  if (typeof plugin === 'function') {
    plugin = plugin();
  }
  return plugin;
}

export function isPluginAvailable(name: string): boolean {
  return availablePlugins.has(name);
}