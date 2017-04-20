import * as path from 'path';
import { fsReadDir, Shell } from '@ionic/cli-utils';

/**
 * Get all platforms based on resource/platforms directories
 * TODO: should we get this from the config.xml or just the directories like app-lib
 */
export async function getProjectPlatforms(projectDir: string): Promise<string[]> {
  let platformDirContents: string[] = [];
  let platformsDir = path.join(projectDir, 'platforms');

  try {
    platformDirContents = await fsReadDir(platformsDir);
  } catch (e) {
    if (e.code === 'ENOENT') {
      return [];
    }
    throw e;
  }
  return platformDirContents;
}

/**
 * Returns true or false after checking if any plugin is installed
 * Synchronous
 *
 * @param {String} baseDir The projects base directory
 * @return {Boolean} True if any plugin is installed
 */
export async function arePluginsInstalled(projectDir: string): Promise<boolean> {
  let pluginDir = path.join(projectDir, 'plugins');
  let hasPlugins = false;

  try {
    await fsReadDir(pluginDir);
    hasPlugins = true;
  } catch (ex) {
    hasPlugins = false;
  }

  return hasPlugins;
}

/**
 * Install required Cordova plugins for Ionic
 */
export async function installPlugins(): Promise<void> {
  const plugins = [
    'cordova-plugin-device',
    'cordova-plugin-console',
    'cordova-plugin-whitelist',
    'cordova-plugin-splashscreen',
    'cordova-plugin-statusbar',
    'ionic-plugin-keyboard'
  ];

  const shell = new Shell();

  for (let plugin of plugins) {
    await shell.run('cordova', ['plugin', 'add', '--save', plugin], {
      fatalOnNotFound: false,
    });
  }
}

/**
 * Install the platform specified using cordova
 *
 * @param {String} platform The platform to install (ios, android, etc.)
 * @return {Promise} Promise upon completion
 */
export function installPlatform(platform: string): Promise<string> {
  return new Shell().run('cordova', ['platform', 'add', '--save', platform], {});
}
