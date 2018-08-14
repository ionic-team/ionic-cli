import * as Debug from 'debug';

import { BaseIntegration } from '../';
import { InfoItem, IntegrationName, ProjectPersonalizationDetails } from '../../../definitions';

const debug = Debug('ionic:cli-utils:lib:integrations:cordova');

export class Integration extends BaseIntegration {
  readonly name: IntegrationName = 'cordova';
  readonly summary = 'Target native iOS and Android with Apache Cordova';
  readonly archiveUrl = 'https://d2ql0qc7j8u4b2.cloudfront.net/integration-cordova.tar.gz';

  async getInfo(): Promise<InfoItem[]> {
    const { getAndroidSdkToolsVersion } = await import('./android');

    const [
      cordovaVersion,
      cordovaPlatforms,
      cordovaPlugins,
      xcode,
      iosDeploy,
      iosSim,
      androidSdkToolsVersion,
    ] = await Promise.all([
      this.getCordovaVersion(),
      this.getCordovaPlatformVersions(),
      this.getCordovaPluginVersions(),
      this.getXcodebuildVersion(),
      this.getIOSDeployVersion(),
      this.getIOSSimVersion(),
      getAndroidSdkToolsVersion(),
    ]);

    const info: InfoItem[] = [
      { group: 'cordova', key: 'cordova', flair: 'Cordova CLI', value: cordovaVersion || 'not installed' },
      { group: 'cordova', key: 'Cordova Platforms', value: cordovaPlatforms },
      { group: 'cordova', key: 'Cordova Plugins', value: cordovaPlugins },
    ];

    if (xcode) {
      info.push({ group: 'system', key: 'Xcode', value: xcode });
    }

    if (iosDeploy) {
      info.push({ group: 'system', key: 'ios-deploy', value: iosDeploy });
    }

    if (iosSim) {
      info.push({ group: 'system', key: 'ios-sim', value: iosSim });
    }

    if (androidSdkToolsVersion) {
      info.push({ group: 'system', key: 'Android SDK Tools', value: androidSdkToolsVersion });
    }

    info.push({ group: 'environment', key: 'ANDROID_HOME', value: process.env.ANDROID_HOME || 'not set' });

    return info;
  }

  async personalize({ name, packageId }: ProjectPersonalizationDetails) {
    const { loadConfigXml } = await import('./config');
    const conf = await loadConfigXml({ project: this.e.project });
    conf.setName(name);

    if (packageId) {
      conf.setBundleId(packageId);
    }

    await conf.save();
  }

  async getCordovaVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('cordova', ['-v', '--no-telemetry', '--no-update-notifier']);
  }

  async getCordovaPlatformVersions(): Promise<string> {
    try {
      const output = await this.e.shell.output('cordova', ['platform', 'ls', '--no-telemetry', '--no-update-notifier'], { showCommand: false });
      const platforms = output
        .replace('Installed platforms:', '')
        .replace(/Available platforms[\s\S]+/, '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('.'));

      if (platforms.length === 0) {
        return 'none';
      }

      return platforms.join(', ');
    } catch (e) {
      debug('Error while getting Cordova platforms: %o', e);
      return 'not available';
    }
  }

  async getCordovaPluginVersions(): Promise<string> {
    const whitelist = [
      /^cordova-plugin-ionic$/,
      /^cordova-plugin-ionic-.+/,
    ];

    try {
      const output = await this.e.shell.output('cordova', ['plugin', 'ls', '--no-telemetry', '--no-update-notifier'], { showCommand: false });
      const pluginRe = /^([a-z-]+)\s+(\d\.\d\.\d).+$/;
      const plugins = output
        .split('\n')
        .map(l => l.trim().match(pluginRe))
        .filter((l): l is RegExpMatchArray => l !== null)
        .map(m => [m[1], m[2]]);

      const whitelistedPlugins = plugins
        .filter(([ plugin, version ]) => whitelist.some(re => re.test(plugin)))
        .map(([ plugin, version ]) => `${plugin} ${version}`);

      const count = plugins.length - whitelistedPlugins.length;

      if (whitelistedPlugins.length === 0) {
        return `no whitelisted plugins (${count} plugins total)`;
      }

      return `${whitelistedPlugins.join(', ')}${count > 0 ? `, (and ${count} other plugins)` : ''}`;
    } catch (e) {
      debug('Error while getting Cordova plugins: %o', e);
      return 'not available';
    }
  }

  async getXcodebuildVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('xcodebuild', ['-version']);
  }

  async getIOSDeployVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('ios-deploy', ['--version']);
  }

  async getIOSSimVersion(): Promise<string | undefined> {
    return this.e.shell.cmdinfo('ios-sim', ['--version']);
  }
}
