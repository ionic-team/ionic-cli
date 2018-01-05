import { InfoHookItem, IntegrationName } from '../../../definitions';

import { BaseIntegration } from '../';

export class Integration extends BaseIntegration {
  name: IntegrationName = 'cordova';

  async getInfo(): Promise<InfoHookItem[]> {
    const { getAndroidSdkToolsVersion } = await import('./android');

    const [
      cordovaVersion,
      cordovaPlatforms,
      xcode,
      iosDeploy,
      iosSim,
      androidSdkToolsVersion,
    ] = await Promise.all([
      this.getCordovaVersion(),
      this.getCordovaPlatformVersions(),
      this.getXcodebuildVersion(),
      this.getIOSDeployVersion(),
      this.getIOSSimVersion(),
      getAndroidSdkToolsVersion(),
    ]);

    const info: InfoHookItem[] = [];

    info.push(
      { type: 'global-packages', key: 'cordova', flair: 'Cordova CLI', value: cordovaVersion || 'not installed' },
      { type: 'local-packages', key: 'Cordova Platforms', value: cordovaPlatforms || 'none' }
    );

    if (xcode) {
      info.push({ type: 'system', key: 'Xcode', value: xcode });
    }

    if (iosDeploy) {
      info.push({ type: 'system', key: 'ios-deploy', value: iosDeploy });
    }

    if (iosSim) {
      info.push({ type: 'system', key: 'ios-sim', value: iosSim });
    }

    if (androidSdkToolsVersion) {
      info.push({ type: 'system', key: 'Android SDK Tools', value: androidSdkToolsVersion });
    }

    info.push({ type: 'environment', key: 'ANDROID_HOME', value: process.env.ANDROID_HOME || 'not set' });

    return info;
  }

  async getCordovaVersion(): Promise<string | undefined> {
    return this.shell.cmdinfo('cordova', ['-v', '--no-telemetry']);
  }

  async getCordovaPlatformVersions(): Promise<string | undefined> {
    let cordovaPlatforms = await this.shell.cmdinfo('cordova', ['platform', 'ls', '--no-telemetry']);

    if (cordovaPlatforms) {
      cordovaPlatforms = cordovaPlatforms.replace(/\s+/g, ' ');
      cordovaPlatforms = cordovaPlatforms.replace('Installed platforms:', '');
      cordovaPlatforms = cordovaPlatforms.replace(/Available platforms.+/, '');
      cordovaPlatforms = cordovaPlatforms.trim();
    }

    return cordovaPlatforms;
  }

  async getXcodebuildVersion(): Promise<string | undefined> {
    return this.shell.cmdinfo('xcodebuild', ['-version']);
  }

  async getIOSDeployVersion(): Promise<string | undefined> {
    return this.shell.cmdinfo('ios-deploy', ['--version']);
  }

  async getIOSSimVersion(): Promise<string | undefined> {
    return this.shell.cmdinfo('ios-sim', ['--version']);
  }
}
