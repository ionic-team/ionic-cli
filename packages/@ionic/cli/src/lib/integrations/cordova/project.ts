import { filter } from '@ionic/utils-array';
import { readJson, readdirSafe, statSafe } from '@ionic/utils-fs';
import Debug from 'debug';
import path from 'path';

import { AndroidBuildOutput, LegacyAndroidBuildOutputEntry } from '../../../definitions';
import { isAndroidBuildOutputFile, isLegacyAndroidBuildOutputFile } from '../../../guards';
import { input } from '../../color';
import { FatalException } from '../../errors';

const debug = Debug('ionic:lib:cordova:project');

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

export async function getAndroidBuildOutputJson(paths: string[]): Promise<LegacyAndroidBuildOutputEntry[] | AndroidBuildOutput> {
  for (const p of paths) {
    try {
      const json = await readJson(p);

      if (isAndroidBuildOutputFile(json)) {
        return json;
      } else if (isLegacyAndroidBuildOutputFile(json)) {
        return json;
      } else {
        debug('Output file does not match expected format: %O', json);
      }
    } catch (e: any) {
      debug('Error parsing file %O: %O', p, e);
    }
  }

  throw new FatalException(
    `Could not find or parse valid build output file.\n` +
    `Tried the following paths:\n` +
    `- ${paths.join('\n- ')}`
  );
}

export async function getAndroidPackageFilePath(root: string, { release = false }: GetPackagePathOptions): Promise<string> {
  const outputPath = path.resolve(root, CORDOVA_ANDROID_PACKAGE_PATH, release ? 'release' : 'debug');
  const outputJsonPaths = ['output.json', 'output-metadata.json'].map(p => path.resolve(outputPath, p));
  const outputJson = await getAndroidBuildOutputJson(outputJsonPaths);

  const p = 'elements' in outputJson
    ? outputJson.elements[0].outputFile
    : outputJson[0].path;

  // TODO: handle multiple files from output.json, prompt to select?
  return path.relative(root, path.resolve(outputPath, p));
}

export interface GetPackagePathOptions {
  emulator?: boolean;
  release?: boolean;
}

/**
 * Get the relative path to most recently built APK or IPA file
 */
export async function getPackagePath(root: string, appName: string, platform: string, { emulator = false, release = false }: GetPackagePathOptions = {}): Promise<string> {
  if (platform === 'android') {
    return getAndroidPackageFilePath(root, { emulator, release });
  } else if (platform === 'ios') {
    if (emulator) {
      return path.join(CORDOVA_IOS_SIMULATOR_PACKAGE_PATH, `${appName}.app`);
    }

    return path.join(CORDOVA_IOS_DEVICE_PACKAGE_PATH, `${appName}.ipa`);
  }

  throw new FatalException(`Unknown package path for ${input(appName)} on ${input(platform)}.`);
}
