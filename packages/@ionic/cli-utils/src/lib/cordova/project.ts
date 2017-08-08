import * as path from 'path';

import { IonicEnvironment } from '../../definitions';
import { readDir } from '../utils/fs';

/**
 * Get all platforms based on platforms directory
 * TODO: should we get this from the config.xml or just the directories like app-lib
 */
export async function getProjectPlatforms(projectDir: string): Promise<string[]> {
  return readDir(path.join(projectDir, 'platforms'));
}

/**
 * Install the platform specified using cordova
 */
export function installPlatform(env: IonicEnvironment, platform: string): Promise<string> {
  return env.shell.run('cordova', ['platform', 'add', '--save', platform], {});
}
