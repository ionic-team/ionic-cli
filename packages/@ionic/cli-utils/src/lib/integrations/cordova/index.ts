import * as path from 'path';

import { pathExists } from '@ionic/cli-framework/utils/fs';

import { InfoItem, IntegrationName, ProjectPersonalizationDetails } from '../../../definitions';
import { BaseIntegration } from '../';
import { ADD_CORDOVA_ENGINE_HOOK, HOOKS_PKG, REMOVE_CORDOVA_ENGINE_HOOK, addHook, removeHook } from '../../hooks';

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

  async enable() {
    const { pkgManagerArgs } = await import('../../utils/npm');

    await super.enable();

    if (this.project.type === 'angular') { // TODO: better way?
      const project = await this.project.load();

      if (!(await pathExists(path.resolve(this.project.directory, 'node_modules', HOOKS_PKG)))) {
        const config = await this.config.load();
        const { npmClient } = config;
        const [ manager, ...managerArgs ] = await pkgManagerArgs({ npmClient, shell: this.shell }, { command: 'install', pkg: HOOKS_PKG });

        await this.shell.run(manager, managerArgs, { cwd: this.project.directory });
      }

      project.hooks['build:before'] = addHook(this.project.directory, project.hooks['build:before'], ADD_CORDOVA_ENGINE_HOOK);
      project.hooks['build:after'] = addHook(this.project.directory, project.hooks['build:after'], REMOVE_CORDOVA_ENGINE_HOOK);
      project.hooks['serve:before'] = addHook(this.project.directory, project.hooks['serve:before'], ADD_CORDOVA_ENGINE_HOOK);
      project.hooks['serve:after'] = addHook(this.project.directory, project.hooks['serve:after'], REMOVE_CORDOVA_ENGINE_HOOK);
    }
  }

  async disable() {
    await super.disable();

    if (this.project.type === 'angular') {
      const project = await this.project.load();

      project.hooks['build:before'] = removeHook(this.project.directory, project.hooks['build:before'], ADD_CORDOVA_ENGINE_HOOK);
      project.hooks['build:after'] = removeHook(this.project.directory, project.hooks['build:after'], REMOVE_CORDOVA_ENGINE_HOOK);
      project.hooks['serve:before'] = removeHook(this.project.directory, project.hooks['serve:before'], ADD_CORDOVA_ENGINE_HOOK);
      project.hooks['serve:after'] = removeHook(this.project.directory, project.hooks['serve:after'], REMOVE_CORDOVA_ENGINE_HOOK);
    }
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
