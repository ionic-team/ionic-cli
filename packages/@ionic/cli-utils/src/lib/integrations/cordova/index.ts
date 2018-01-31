import { InfoItem, IntegrationName, ProjectPersonalizationDetails } from '../../../definitions';

import { BaseIntegration } from '../';

export class Integration extends BaseIntegration {
  name: IntegrationName = 'cordova';
  archiveUrl = 'https://d2ql0qc7j8u4b2.cloudfront.net/integration-cordova.tar.gz';

  async getInfo(): Promise<InfoItem[]> {
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

    const info: InfoItem[] = [];

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

  async personalize({ appName, bundleId }: ProjectPersonalizationDetails) {
    const { ConfigXml } = await import('./config');
    const conf = await ConfigXml.load(this.project.directory);
    conf.setName(appName);

    if (bundleId) {
      conf.setBundleId(bundleId);
    }

    await conf.save();
  }

  async getCordovaVersion(): Promise<string | undefined> {
    return this.shell.cmdinfo('cordova', ['-v', '--no-telemetry']);
  }

  async getCordovaPlatformVersions(): Promise<string | undefined> {
    const output = await this.shell.cmdinfo('cordova', ['platform', 'ls', '--no-telemetry']);

    return output ? output
      .replace(/\s+/g, ' ')
      .replace('Installed platforms:', '')
      .replace(/Available platforms.+/, '')
      .trim() : undefined;
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
