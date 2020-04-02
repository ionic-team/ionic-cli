import { filter } from '@ionic/utils-array';
import { readJson, readdirSafe, statSafe } from '@ionic/utils-fs';
import * as path from 'path';

import { input } from '../../color';
import { FatalException } from '../../errors';

const CORDOVA_ANDROID_PACKAGE_PATH = 'platforms/android/app/build/outputs/apk/';
const CORDOVA_IOS_SIMULATOR_PACKAGE_PATH = 'platforms/ios/build/emulator';
const CORDOVA_IOS_DEVICE_PACKAGE_PATH = 'platforms/ios/build/device';

export async function getPlatforms(projectDir: string): Promise<string[]> {
  const platformsDir = path.resolve(projectDir, 'platforms');
  const contents = await readdirSafe(platformsDir);
  const platforms = await filter(contents, async file => {
    const stat = await statSafe(path.join(platformsDir, file));
    return !file.startsWith('.') && typeof stat !== 'undefined' && stat.isDirectory();
  });

  return platforms;
}

export interface AndroidBuildOutputEntry {
  outputType: {
    type: string;
  };
  path: string;
}

export async function getAndroidBuildOutputJson(p: string): Promise<AndroidBuildOutputEntry[]> {
  try {
    return await readJson(p); // TODO: type check
  } catch (e) {
    throw new FatalException(`Could not parse build output file: ${p}`);
  }
}

export interface GetPackagePathOptions {
  emulator?: boolean;
  release?: boolean;
}

/**
 * Get the relative path to most recently built APK or IPA file
 */
export async function getPackagePath(appName: string, platform: string, { emulator = false, release = false }: GetPackagePathOptions = {}): Promise<string> {
  if (platform === 'android') {
    const outputPath = path.join(CORDOVA_ANDROID_PACKAGE_PATH, release ? 'release' : 'debug');
    const outputJsonPath = path.join(outputPath, 'output.json');
    const outputJson = await getAndroidBuildOutputJson(outputJsonPath);

    // TODO: handle multiple files from output.json, prompt to select?
    return path.join(outputPath, outputJson[0].path);
  } else if (platform === 'ios') {
    if (emulator) {
      return path.join(CORDOVA_IOS_SIMULATOR_PACKAGE_PATH, `${appName}.app`);
    }

    return path.join(CORDOVA_IOS_DEVICE_PACKAGE_PATH, `${appName}.ipa`);
  }

  throw new FatalException(`Unknown package path for ${input(appName)} on ${input(platform)}.`);
}
