import { filter } from '@ionic/utils-array';
import { readdirSafe, statSafe } from '@ionic/utils-fs';
import * as path from 'path';

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

export async function getPackagePath(appName: string, platform: string, emulator: boolean): Promise<string> {
  if (platform === 'android') {
    // TODO: don't hardcode this/support multiple build paths (ex: multiple arch builds)
    // use app/build/outputs/apk/debug/output.json?
    return path.join(CORDOVA_ANDROID_PACKAGE_PATH, 'debug', 'app-debug.apk');
  }
  if (platform === 'ios' && emulator) {
    return path.join(CORDOVA_IOS_SIMULATOR_PACKAGE_PATH, `${appName}.app`);
  } else {
    return path.join(CORDOVA_IOS_DEVICE_PACKAGE_PATH, `${appName}.ipa`);
  }
}
