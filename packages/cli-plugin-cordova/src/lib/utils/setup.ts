import * as path from 'path';
import { IonicEnvironment, readDir } from '@ionic/cli-utils';

/**
 * Get all platforms based on platforms directory
 * TODO: should we get this from the config.xml or just the directories like app-lib
 */
export async function getProjectPlatforms(projectDir: string): Promise<string[]> {
  return readDir(path.join(projectDir, 'platforms'));
}

/**
 * Get all plugins based on plugins directory
 */
export async function getProjectPlugins(projectDir: string): Promise<string[]> {
  return readDir(path.join(projectDir, 'plugins'));
}

/**
 * Install the platform specified using cordova
 *
 * @param {String} platform The platform to install (ios, android, etc.)
 * @return {Promise} Promise upon completion
 */
export function installPlatform(env: IonicEnvironment, platform: string): Promise<string> {
  return env.shell.run('cordova', ['platform', 'add', '--save', platform], {});
}
